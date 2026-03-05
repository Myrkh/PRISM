"""API routes — POST /api/v1/calculate/sif"""
from __future__ import annotations
from typing import Literal
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from core.math.pfd_calc import SubsystemParams, PFDResult, calc_pfd, pfd_at_time
from core.models.architectures import SIL_META, ARCH_INFO

router = APIRouter(prefix="/api/v1")


class SIFRequest(BaseModel):
    subsystems: list[SubsystemParams] = Field(..., min_length=1, max_length=10)
    time_points: list[float] | None = Field(None, description="Time points for PFD curve [hr]")


class SubsystemResult(BaseModel):
    index: int
    params: SubsystemParams
    result: PFDResult
    arch_info: dict


class SIFResponse(BaseModel):
    subsystems: list[SubsystemResult]
    system_PFD: float
    system_SIL: Literal[0, 1, 2, 3, 4]
    system_RRF: float
    pfd_curve: list[dict] | None = None


@router.post("/calculate/sif", response_model=SIFResponse)
def calculate_sif(req: SIFRequest) -> SIFResponse:
    """
    Calculate PFD, SFF, DC, HFT, RRF, SIL for each subsystem.
    System PFD = sum of subsystem PFDs (series model).
    """
    results: list[SubsystemResult] = []
    system_pfd = 0.0

    for i, sub in enumerate(req.subsystems):
        try:
            res = calc_pfd(sub)
        except Exception as e:
            raise HTTPException(status_code=422, detail=f"Subsystem {i}: {e}")

        system_pfd += res.PFD_avg
        results.append(SubsystemResult(
            index=i,
            params=sub,
            result=res,
            arch_info=ARCH_INFO.get(sub.architecture, {}),
        ))

    from core.math.pfd_calc import classify_sil
    system_sil = classify_sil(system_pfd)

    # Optional PFD vs time curve
    pfd_curve = None
    if req.time_points:
        pfd_curve = []
        for t in req.time_points:
            point: dict = {"t": t}
            total = 0.0
            for j, sub in enumerate(req.subsystems):
                v = pfd_at_time(sub.architecture, t, sub)
                point[f"sub{j}"] = v
                total += v
            point["total"] = total
            pfd_curve.append(point)

    return SIFResponse(
        subsystems=results,
        system_PFD=system_pfd,
        system_SIL=system_sil,
        system_RRF=1 / system_pfd if system_pfd > 0 else float("inf"),
        pfd_curve=pfd_curve,
    )


@router.get("/architectures")
def list_architectures() -> dict:
    """Return supported architectures with metadata."""
    return {"architectures": ARCH_INFO}


@router.get("/sil-table")
def sil_table() -> dict:
    """Return IEC 61508 SIL classification table."""
    return {"sil_levels": {k: v.model_dump() for k, v in SIL_META.items()}}
