"""
PRISM Markov Backend — FastAPI Application
Solveur Markov exact pour SIF IEC 61508-6.

Endpoints :
  POST /api/markov/compute         → Calcul synchrone (< 30s)
  POST /api/markov/montecarlo      → Monte Carlo asynchrone
  GET  /api/markov/status/{job_id} → Statut job MC
  POST /api/markov/verify          → Vérification vs tables IEC
  GET  /api/markov/health          → Health check
"""

import time
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware

from models import (
    MarkovComputeRequest, MonteCarloRequest,
    MarkovComputeResponse, AsyncJobResponse,
    SubsystemContribution, PSTResult, PDSResult, JobStatus,
)
from solver import SubsystemParams, pfd_arch, pfh_arch, pfh_arch_corrected, sil_from_pfd, sil_from_pfh
from solver.markov import compute_exact, MarkovSolver
from solver.formulas import lambda_T1_product, markov_required

# ─── Job store (en mémoire — pour prod utiliser Redis) ───────────────────────
_jobs: dict = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 PRISM Markov Backend démarré")
    yield
    print("🛑 PRISM Markov Backend arrêté")


app = FastAPI(
    title="PRISM Markov Backend",
    description="Solveur Markov exact IEC 61508-6 pour systèmes instrumentés de sécurité",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────────────────────────────────────────
# Logique de calcul principale
# ─────────────────────────────────────────────────────────────────────────────

def _select_method(p: SubsystemParams, force_markov: bool,
                   threshold: float) -> str:
    """Sélectionne la méthode de calcul optimale."""
    lt1 = lambda_T1_product(p)
    if force_markov or lt1 > threshold:
        return "markov"
    return "iec"


def _compute_subsystem(sub_req, demand_mode: str,
                        force_markov: bool, threshold: float) -> dict:
    """Calcule PFD/PFH pour un sous-système."""
    p = sub_req.to_params()
    arch = sub_req.architecture.value
    lt1 = lambda_T1_product(p)
    method = _select_method(p, force_markov, threshold)

    warnings = []

    if demand_mode == "low_demand":
        if method == "markov":
            result = compute_exact(p, mode="low_demand")
            pfdavg = result["pfdavg"]
            warnings.extend(result.get("warnings", []))
            method_str = result.get("method", "Markov-CTMC")
        else:
            pfdavg = pfd_arch(p, arch)
            method_str = "IEC-Approx"
            if lt1 > 0.05:
                warnings.append(f"λ×T1 = {lt1:.3f} : vérification Markov recommandée")

        return {
            "pfdavg": pfdavg,
            "pfh": None,
            "method": method_str,
            "lambda_T1": lt1,
            "warnings": warnings,
        }

    else:  # high_demand
        if method == "markov":
            solver = MarkovSolver(p)
            pfh = solver.compute_pfh()
            method_str = "Markov-CTMC (stationnaire)"
        else:
            pfh = pfh_arch(p, arch)
            method_str = "IEC-Approx"

        return {
            "pfdavg": None,
            "pfh": pfh,
            "method": method_str,
            "lambda_T1": lt1,
            "warnings": warnings,
        }


def _compute_sync(request: MarkovComputeRequest) -> MarkovComputeResponse:
    """Exécution synchrone du calcul complet."""
    t_start = time.perf_counter()
    mode = request.demand_mode.value
    all_warnings = []
    contributions = []

    pfd_total = 0.0
    pfh_total = 0.0
    lambda_T1_max = 0.0
    method_used_set = set()

    for sub_req in request.subsystems:
        result = _compute_subsystem(
            sub_req, mode,
            request.force_markov,
            request.threshold_lambda_T1
        )
        all_warnings.extend(result["warnings"])
        method_used_set.add(result["method"])
        lambda_T1_max = max(lambda_T1_max, result["lambda_T1"])

        if mode == "low_demand":
            pfd_total += result["pfdavg"]
            contributions.append(SubsystemContribution(
                name=sub_req.name,
                architecture=sub_req.architecture.value,
                pfdavg=result["pfdavg"],
                pct_contribution=0.0,  # recalculé après
                lambda_T1=result["lambda_T1"],
                method_used=result["method"],
            ))
        else:
            pfh_total += result["pfh"]

    # Contributions relatives
    if mode == "low_demand" and pfd_total > 0:
        for c in contributions:
            c.pct_contribution = c.pfdavg / pfd_total * 100

    # PST
    pst_result = PSTResult(enabled=request.pst.enabled)
    if request.pst.enabled and len(request.subsystems) == 1:
        from solver.pst import PSTSolver
        p = request.subsystems[0].to_params()
        pst_solver = PSTSolver(
            p,
            T_PST=request.pst.T_PST,
            c_PST=request.pst.c_PST,
            d_PST=request.pst.d_PST,
        )
        pst_data = pst_solver.compute_pfdavg()
        pst_result = PSTResult(
            enabled=True,
            pfdavg_with_pst=pst_data["pfdavg_with_pst"],
            pfdavg_without_pst=pst_data["pfdavg_without_pst"],
            improvement_factor=pst_data["improvement_factor"],
            iec_error_pct=pst_data["iec_error_pct"],
            warnings=pst_data.get("warnings", []),
        )
        # Remplacer PFD total par résultat PST
        pfd_total = pst_data["pfdavg_with_pst"]
        all_warnings.extend(pst_data.get("warnings", []))

    # PDS
    pds_result = PDSResult(enabled=request.pds.enabled)
    if request.pds.enabled:
        from solver.pds import PDSSolver
        p = request.subsystems[0].to_params()
        pds_solver = PDSSolver(
            p,
            ptif_fraction=request.pds.ptif_fraction,
            cPT=request.pds.cPT,
            additional_ptif=request.pds.additional_ptif,
        )
        pds_data = pds_solver.compute()
        pds_result = PDSResult(
            enabled=True,
            pfd=pds_data["pfd"],
            ptif=pds_data["ptif"],
            csu=pds_data["csu"],
            sil_from_pfd=pds_data["sil_from_pfd"],
            sil_from_csu=pds_data["sil_from_csu"],
            warnings=pds_data.get("warnings", []),
        )
        all_warnings.extend(pds_data.get("warnings", []))
        if request.pds.use_csu_for_sil:
            pfd_total = pds_data["csu"]

    # SIL final
    if mode == "low_demand":
        sil_pfd = sil_from_pfd(pfd_total)
        sil_arch = sil_pfd  # simplification (sans contrainte architecturale)
        metric = pfd_total
        rrf = 1.0 / pfd_total if pfd_total > 0 else float("inf")
    else:
        sil_pfd = sil_from_pfh(pfh_total)
        sil_arch = sil_pfd
        metric = pfh_total
        rrf = 1.0 / pfh_total if pfh_total > 0 else float("inf")

    t_elapsed = (time.perf_counter() - t_start) * 1000
    method_str = " + ".join(sorted(method_used_set))

    return MarkovComputeResponse(
        pfdavg=metric,
        rrf=rrf,
        sil_from_pfd=sil_pfd,
        sil_achieved=sil_arch,
        contributions=contributions,
        pst=pst_result,
        pds=pds_result,
        method_used=method_str,
        lambda_T1=lambda_T1_max,
        warnings=all_warnings,
        computation_time_ms=t_elapsed,
    )


# ─────────────────────────────────────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/api/markov/compute", response_model=MarkovComputeResponse)
async def compute_markov(request: MarkovComputeRequest):
    """
    Calcul Markov synchrone.
    Sélectionne automatiquement IEC approx ou Markov exact selon λ×T1.
    """
    try:
        return _compute_sync(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur calcul: {str(e)}")


@app.post("/api/markov/montecarlo", response_model=AsyncJobResponse)
async def compute_montecarlo(
    request: MonteCarloRequest,
    background_tasks: BackgroundTasks,
):
    """
    Monte Carlo asynchrone — retourne job_id immédiatement.
    Sonder /api/markov/status/{job_id} pour le résultat.
    """
    job_id = str(uuid.uuid4())
    _jobs[job_id] = {"status": JobStatus.PENDING, "progress": 0, "result": None}

    def run_mc():
        _jobs[job_id]["status"] = JobStatus.RUNNING
        try:
            from solver.montecarlo import SystemMonteCarlo, UncertaintyModel

            mc = SystemMonteCarlo(seed=request.seed)

            # Construire la liste des sous-systèmes avec incertitudes
            subsystems = []
            for sub_req in request.base_request.subsystems:
                p = sub_req.to_params()
                unc = None
                if request.uncertainty and request.uncertainty_cov > 0:
                    lambda_D = p.lambda_DU + p.lambda_DD
                    ef = math.exp(request.uncertainty_cov * 1.645)
                    unc = UncertaintyModel(lambda_D, error_factor=ef)
                subsystems.append({
                    "params": p,
                    "uncertainty": unc,
                    "architecture": sub_req.architecture.value,
                })

            result = mc.run(
                subsystems=subsystems,
                n_simulations=request.n_simulations,
                progress_callback=lambda prog: _jobs[job_id].update({"progress": prog}),
            )
            _jobs[job_id]["status"] = JobStatus.DONE
            _jobs[job_id]["result"] = result
        except Exception as e:
            _jobs[job_id]["status"] = JobStatus.FAILED
            _jobs[job_id]["error"] = str(e)

    background_tasks.add_task(run_mc)
    return AsyncJobResponse(job_id=job_id, status=JobStatus.PENDING)


@app.get("/api/markov/status/{job_id}", response_model=AsyncJobResponse)
async def get_job_status(job_id: str):
    """Interroge le statut d'un job Monte Carlo asynchrone."""
    if job_id not in _jobs:
        raise HTTPException(status_code=404, detail=f"Job {job_id} introuvable")

    job = _jobs[job_id]
    return AsyncJobResponse(
        job_id=job_id,
        status=job["status"],
        progress_pct=job.get("progress"),
        result=job.get("result"),
        error=job.get("error"),
    )


@app.post("/api/markov/verify")
async def verify_iec_tables():
    """
    Lance la vérification vs tableaux IEC 61508-6.
    Retourne les 14 cas de test du fichier 13.
    """
    from tests.test_verification import run_all_verification_cases
    return run_all_verification_cases()


@app.get("/api/markov/health")
async def health_check():
    return {
        "status": "ok",
        "version": "2.0.0",
        "engine": "PRISM Markov Backend",
        "capabilities": [
            "IEC-Approx", "Markov-CTMC", "PFH-Corrected",
            "PST-MultiPhase", "PDS-PTIF", "STR-Analytical",
            "STR-Markov", "MTTFS", "MonteCarlo",
        ],
    }


@app.post("/api/str/compute")
async def compute_str(request: MarkovComputeRequest):
    """
    Calcule le Spurious Trip Rate (analytique + Markov).
    Source : NTNU Ch.12 (MD 21_STR_SPURIOUS_TRIP).
    """
    try:
        from solver.str_solver import str_analytical, str_markov

        results = []
        for sub_req in request.subsystems:
            p = sub_req.to_params()
            analytical = str_analytical(p)
            markov = str_markov(p) if p.lambda_SO > 0 else None
            results.append({
                "name": sub_req.name,
                "architecture": sub_req.architecture.value,
                "analytical": analytical,
                "markov": markov,
            })

        # SIF total STR = sum of subsystem STRs (NTNU Ch.12 slide 18)
        str_total = sum(r["analytical"]["str_total"] for r in results)
        mttfs_total = 1.0 / str_total if str_total > 0 else float('inf')

        return {
            "str_sif_total": str_total,
            "trips_per_year": str_total * 8760.0,
            "mttfs_years": mttfs_total / 8760.0,
            "subsystems": results,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur STR: {str(e)}")


@app.post("/api/pfh/corrected")
async def compute_pfh_corrected(request: MarkovComputeRequest):
    """
    PFH corrigé (Omeiri/Innal 2021) — montre l'erreur IEC.
    Source : MD 22_PFH_CORRECTED.
    """
    try:
        from solver.formulas import pfh_arch, pfh_arch_corrected, sil_from_pfh

        results = []
        for sub_req in request.subsystems:
            p = sub_req.to_params()
            pfh_iec = pfh_arch(p)
            pfh_corr = pfh_arch_corrected(p)
            ecart = (pfh_iec - pfh_corr) / pfh_corr * 100 if pfh_corr > 0 else 0.0

            results.append({
                "name": sub_req.name,
                "architecture": sub_req.architecture.value,
                "pfh_iec": pfh_iec,
                "pfh_corrected": pfh_corr,
                "ecart_pct": ecart,
                "sil_iec": sil_from_pfh(pfh_iec),
                "sil_corrected": sil_from_pfh(pfh_corr),
                "iec_underestimates": pfh_iec < pfh_corr,
            })

        return {"subsystems": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur PFH: {str(e)}")


# ─────────────────────────────────────────────────────────────────────────────
# Import math manquant dans run_mc closure
# ─────────────────────────────────────────────────────────────────────────────
import math


# ─────────────────────────────────────────────────────────────────────────────
# EXTENSIONS V3.3 — Nouveaux endpoints
# ─────────────────────────────────────────────────────────────────────────────

from pydantic import BaseModel as _BaseModel
from typing import Optional as _Opt, List as _List


class KoonRequest(_BaseModel):
    lambda_DU: float
    lambda_DD: float = 0.0
    DC: float = 0.0
    beta: float = 0.02
    beta_D: float = 0.01
    MTTR: float = 8.0
    T1: float = 8760.0
    k: int
    n: int
    mode: str = "both"  # "pfd" | "pfh" | "both"


@app.post("/v2/koon/compute", summary="PFD/PFH koon généralisé (toutes architectures)")
async def koon_compute(req: KoonRequest):
    """
    PFH/PFD pour architecture koon (k-out-of-n) généralisé.
    Supporte 1oo1..4oo4 et au-delà.

    Source : IEC 61508-6 §B.3.2.2 + NTNU Ch9 (formule n!/(k-1)! vérifiée).
    """
    try:
        from solver.extensions import pfh_moon, pfd_koon_generic, pfd_arch_extended
        from solver.formulas import sil_from_pfd, sil_from_pfh
        p = SubsystemParams(
            lambda_DU=req.lambda_DU, lambda_DD=req.lambda_DD, DC=req.DC,
            beta=req.beta, beta_D=req.beta_D, MTTR=req.MTTR, T1=req.T1
        )
        result = {"k": req.k, "n": req.n, "arch": f"{req.k}oo{req.n}"}
        if req.mode in ("pfh", "both"):
            pfh = pfh_moon(p, req.k, req.n)
            result.update({"pfh": pfh, "sil_pfh": sil_from_pfh(pfh)})
        if req.mode in ("pfd", "both"):
            pfd = pfd_koon_generic(p, req.k, req.n)
            result.update({"pfd": pfd, "sil_pfd": sil_from_pfd(pfd)})
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class PFDCurveRequest(_BaseModel):
    lambda_DU: float
    lambda_DD: float = 0.0
    DC: float = 0.0
    beta: float = 0.02
    beta_D: float = 0.01
    MTTR: float = 8.0
    T1: float = 8760.0
    architecture: str = "1oo2"
    n_points: int = 200


@app.post("/v2/pfd/curve", summary="PFD(t) instantané — courbe en dents de scie")
async def pfd_curve(req: PFDCurveRequest):
    """
    Calcule PFD(t) instantané sur une période T1.
    Retourne la courbe, PFDmax, PFDavg, SIL, et fraction de temps par zone SIL.

    Source : IEC 61508-6 §B.3.2.2 — PFD(t) = pfd_arch(T1_eff=2t).
    """
    try:
        from solver.extensions import pfd_instantaneous
        p = SubsystemParams(
            lambda_DU=req.lambda_DU, lambda_DD=req.lambda_DD, DC=req.DC,
            beta=req.beta, beta_D=req.beta_D, MTTR=req.MTTR, T1=req.T1
        )
        res = pfd_instantaneous(p, req.architecture, req.n_points)
        return {
            "t":        res.t.tolist(),
            "pfd_t":    res.pfd_t.tolist(),
            "pfd_avg":  res.pfd_avg,
            "pfd_max":  res.pfd_max,
            "pfd_max_over_avg": res.pfd_max / res.pfd_avg if res.pfd_avg > 0 else None,
            "sil_avg":  res.sil_avg,
            "sil_worst": res.sil_min,
            "frac_sil": res.frac_sil,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class MGLRequest(_BaseModel):
    lambda_DU: float
    lambda_DD: float = 0.0
    DC: float = 0.0
    beta: float = 0.02
    beta_D: float = 0.01
    MTTR: float = 8.0
    T1: float = 8760.0
    architecture: str = "1oo2"
    gamma: float = 0.5    # fraction CCF triplets / paires
    delta: float = 0.5    # fraction CCF quad / triplets


@app.post("/v2/ccf/mgl", summary="PFD/PFH avec modèle MGL (Multiple Greek Letters)")
async def ccf_mgl(req: MGLRequest):
    """
    PFD avec modèle CCF MGL (Multiple Greek Letters).
    Affine le modèle β simple : distingue paires (β), triplets (β×γ), quadruplets (β×γ×δ).
    Source : IEC 61508-6 Annexe D.
    """
    try:
        from solver.extensions import pfd_mgl, pfh_mgl, MGLParams, pfd_arch_extended, pfh_moon
        from solver.formulas import sil_from_pfd, sil_from_pfh
        import re
        p = SubsystemParams(
            lambda_DU=req.lambda_DU, lambda_DD=req.lambda_DD, DC=req.DC,
            beta=req.beta, beta_D=req.beta_D, MTTR=req.MTTR, T1=req.T1
        )
        mgl = MGLParams(beta=req.beta, gamma=req.gamma, delta=req.delta)
        m = re.match(r'^(\d+)oo(\d+)$', req.architecture)
        k, n = (int(m.group(1)), int(m.group(2))) if m else (1, 2)
        pfd_b = pfd_arch_extended(p, req.architecture)
        pfd_m = pfd_mgl(p, req.architecture, mgl)
        pfh_m = pfh_mgl(p, k, n, mgl)
        return {
            "architecture": req.architecture,
            "pfd_beta_simple": pfd_b,
            "pfd_mgl":         pfd_m,
            "pfh_mgl":         pfh_m,
            "sil_pfd_mgl":     sil_from_pfd(pfd_m),
            "sil_pfh_mgl":     sil_from_pfh(pfh_m),
            "mgl_params":      {"beta": req.beta, "gamma": req.gamma, "delta": req.delta},
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class ArchConstraintRequest(_BaseModel):
    lambda_DU: float
    lambda_DD: float = 0.0
    lambda_S:  float = 0.0
    k: int = 1
    n: int = 2
    pfd_or_pfh: _Opt[float] = None
    mode: str = "low_demand"       # "low_demand" | "high_demand"
    component_type: str = "B"      # "A" | "B"


@app.post("/v2/arch/constraints", summary="Contraintes architecturales Route 1H/2H + verdict SIL")
async def arch_constraints(req: ArchConstraintRequest):
    """
    Calcule SFF, HFT et SIL max selon contraintes architecturales IEC 61508-2.
    Route 1H (avec SFF) et Route 2H (données terrain).
    Si pfd_or_pfh fourni : retourne verdict SIL final = min(SIL_prob, SIL_arch).
    Source : IEC 61508-2 Table 2 + NTNU Architectural Constraints slides.
    """
    try:
        from solver.extensions import architectural_constraints, sil_achieved
        ac = architectural_constraints(req.lambda_DU, req.lambda_DD, req.lambda_S, req.k, req.n)
        result = {
            "sff":          ac.sff,
            "sff_pct":      round(ac.sff * 100, 1),
            "sff_band":     ac.sff_band,
            "hft":          ac.hft,
            "sil_max_1H_A": ac.sil_max_1H_A,
            "sil_max_1H_B": ac.sil_max_1H_B,
            "sil_max_2H":   ac.sil_max_2H,
            "warning":      ac.warning,
        }
        if req.pfd_or_pfh is not None:
            v = sil_achieved(req.pfd_or_pfh, req.lambda_DU, req.lambda_DD, req.lambda_S,
                             req.k, req.n, req.mode, req.component_type)
            result.update({
                "sil_probabilistic":   v["sil_prob"],
                "sil_architectural":   v["sil_arch_1H"],
                "sil_final":           v["sil_final"],
                "limiting_factor":     v["limiting_factor"],
            })
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class DemandDurationRequest(_BaseModel):
    lambda_DU:        float
    lambda_de:        float        # taux de demande [1/h]
    demand_duration:  float        # durée d'une demande [h]
    T1:               float = 8760.0
    MRT:              float = 8.0


@app.post("/v2/pfd/demand_duration", summary="PFD en mode demande avec durée de demande non-nulle")
async def pfd_demand(req: DemandDurationRequest):
    """
    PFD avec modèle de durée de demande (demand duration model).
    Source : NTNU Ch8 §"Including Demand Duration" slide 28.
    """
    try:
        from solver.extensions import pfd_demand_duration
        r = pfd_demand_duration(req.lambda_DU, req.lambda_de, req.demand_duration, req.T1, req.MRT)
        return r
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class RouteRequest(_BaseModel):
    lambda_DU:    float
    lambda_DD:    float = 0.0
    DC:           float = 0.0
    beta:         float = 0.02
    beta_D:       float = 0.01
    MTTR:         float = 8.0
    T1:           float = 8760.0
    architecture: str = "1oo2"
    mode:         str = "pfd"
    force_markov: bool = False


@app.post("/v2/compute/auto", summary="Calcul auto : IEC simplifié ou Markov CTMC selon λ×T1")
async def compute_auto(req: RouteRequest):
    """
    Routage automatique : bascule vers Markov CTMC si λD×T1 > 0.1.
    Retourne le résultat PFD ou PFH avec indication du moteur utilisé.
    """
    try:
        from solver.extensions import route_compute
        p = SubsystemParams(
            lambda_DU=req.lambda_DU, lambda_DD=req.lambda_DD, DC=req.DC,
            beta=req.beta, beta_D=req.beta_D, MTTR=req.MTTR, T1=req.T1
        )
        r = route_compute(p, req.architecture, req.mode, req.force_markov)
        return r
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
