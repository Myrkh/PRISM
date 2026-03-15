from __future__ import annotations

import copy
import hashlib
import json
import math
import time
from dataclasses import dataclass
from typing import Any, Literal

from sil_engine import (
    MarkovSolver,
    SubsystemParams,
    pfd_arch_extended,
    pfd_instantaneous,
    pfh_arch_corrected,
    pfh_moon,
    route_compute,
)
from sil_engine.pst import PSTSolver

from app.schemas import (
    ChannelDef,
    ComponentParams,
    EngineInput,
    SILBackendMeta,
    SILBackendSubsystemMeta,
    SILComputeRequest,
    SILComputeResponse,
    WarningEntry,
)

APP_VERSION = "0.1.0"
STANDARD_ARCHITECTURES = {"1oo1", "1oo2", "1oo2D", "2oo2", "2oo3", "1oo3"}


@dataclass
class ResolvedRates:
    lambdaDU: float
    lambdaDD: float
    lambdaSU: float
    lambdaSD: float
    lambda_total: float
    sff: float


@dataclass
class PreparedComponent:
    result: dict[str, Any]
    rates: ResolvedRates
    mttr: float
    mttr_du: float
    t1: float
    t2: float
    ptc: float
    determined_character: str
    uses_partial_stroke: bool


@dataclass
class PreparedChannel:
    result: dict[str, Any]
    rates: ResolvedRates
    mttr: float
    mttr_du: float
    t1: float
    t2: float
    ptc: float
    determined_character: str
    has_partial_stroke: bool


class WarningCollector:
    def __init__(self) -> None:
        self._items: list[WarningEntry] = []
        self._seen: set[tuple[str, str | None, str]] = set()

    def add(self, code: str, severity: Literal["INFO", "WARNING", "ERROR"], message: str, affected: str | None = None) -> None:
        key = (code, affected, message)
        if key in self._seen:
            return
        self._seen.add(key)
        self._items.append(WarningEntry(code=code, severity=severity, message=message, affected=affected))

    def extend_engine_warnings(self, prefix: str, affected: str | None, warnings: list[str]) -> None:
        for warning in warnings:
            self.add(prefix, "WARNING", warning, affected=affected)

    @property
    def items(self) -> list[WarningEntry]:
        return self._items


def compute_sil(payload: SILComputeRequest) -> SILComputeResponse:
    started_at = time.perf_counter()
    warnings = WarningCollector()
    engine_input = payload.input
    runtime = payload.runtime

    input_digest = hashlib.sha256(
        json.dumps(engine_input.model_dump(by_alias=True), sort_keys=True, separators=(",", ":")).encode("utf-8")
    ).hexdigest()

    sensors_result, sensors_meta = _compute_subsystem(
        name="sensors",
        subsystem=engine_input.sif.sensors,
        mission_time=engine_input.sif.missionTime,
        default_standard=engine_input.options.standard,
        demand_mode=engine_input.sif.demandMode,
        runtime_mode=runtime.calculationMode,
        warnings=warnings,
    )
    solver_result, solver_meta = _compute_solver(
        solver=engine_input.sif.solver,
        mission_time=engine_input.sif.missionTime,
        default_standard=engine_input.options.standard,
        demand_mode=engine_input.sif.demandMode,
        runtime_mode=runtime.calculationMode,
        warnings=warnings,
    )
    actuators_result, actuators_meta = _compute_subsystem(
        name="actuators",
        subsystem=engine_input.sif.actuators,
        mission_time=engine_input.sif.missionTime,
        default_standard=engine_input.options.standard,
        demand_mode=engine_input.sif.demandMode,
        runtime_mode=runtime.calculationMode,
        warnings=warnings,
    )

    total_pfd = _combine_series_pfd([
        sensors_result["pfdavg"] or 0.0,
        solver_result["pfdavg"] or 0.0,
        actuators_result["pfdavg"] or 0.0,
    ])
    total_pfh = sum(item["pfh"] or 0.0 for item in [sensors_result, solver_result, actuators_result])
    relevant_total = total_pfd if engine_input.sif.demandMode == "LOW_DEMAND" else total_pfh

    contributions = {
        "sensors": _with_contribution(sensors_result, relevant_total, engine_input.sif.demandMode),
        "solver": _with_contribution(solver_result, relevant_total, engine_input.sif.demandMode),
        "actuators": _with_contribution(actuators_result, relevant_total, engine_input.sif.demandMode),
    }

    sil_prob = _sil_from_value(
        total_pfd if engine_input.sif.demandMode == "LOW_DEMAND" else total_pfh,
        engine_input.sif.demandMode,
    )
    sil_arch = {
        "sensors": sensors_result["silArchitectural"],
        "solver": solver_result["silArchitectural"],
        "actuators": actuators_result["silArchitectural"],
    }
    sil_achieved = _min_optional([sil_prob, sil_arch["sensors"], sil_arch["solver"], sil_arch["actuators"]])
    rrf = (1.0 / total_pfd) if total_pfd > 0 else None

    curve = None
    should_include_curve = runtime.includeCurve if runtime.includeCurve is not None else engine_input.options.computeCurve
    if should_include_curve:
        curve = _build_curve(
            engine_input=engine_input,
            subsystem_meta={
                "sensors": sensors_meta,
                "actuators": actuators_meta,
            },
            warnings=warnings,
            points=max(engine_input.options.curvePoints, 10),
        )

    runtime_ms = (time.perf_counter() - started_at) * 1000.0
    backend = SILBackendMeta(
        service="prism-sil-backend",
        serviceVersion=APP_VERSION,
        runtimeMs=runtime_ms,
        inputDigest=input_digest,
        requestedMode=runtime.calculationMode,
        subsystems={
            "sensors": sensors_meta,
            "solver": solver_meta,
            "actuators": actuators_meta,
        },
    )

    return SILComputeResponse(
        result={
            "sifId": engine_input.sif.id,
            "pfdavg": total_pfd,
            "pfh": total_pfh,
            "str": None,
            "mttps": None,
            "rrf": rrf,
            "silFromPFD": sil_prob,
            "silArchitectural": sil_arch,
            "silAchieved": sil_achieved,
            "contributions": contributions,
            "curve": curve,
            "warnings": warnings.items,
        },
        backend=backend,
    )


def _compute_solver(
    solver: Any,
    mission_time: float,
    default_standard: str,
    demand_mode: str,
    runtime_mode: str,
    warnings: WarningCollector,
) -> tuple[dict[str, Any], SILBackendSubsystemMeta]:
    architecture = solver.architecture or "1oo1"
    effective_architecture = _normalize_architecture(architecture, solver.voting["M"], solver.voting["N"]) if solver.voting else "1oo1"

    if solver.mode == "SIMPLE":
        sil_prob = _sil_from_value(
            (solver.pfd or 0.0) if demand_mode == "LOW_DEMAND" else (solver.pfh or 0.0),
            demand_mode,
        )
        return (
            {
                "pfdavg": solver.pfd or 0.0,
                "pfh": solver.pfh or 0.0,
                "silFromPFD": sil_prob,
                "silArchitectural": None,
                "hft": 0,
                "sff": 0.0,
                "pfd_ccf": None,
                "pfd_independent": None,
                "channelResults": [],
            },
            SILBackendSubsystemMeta(
                architecture=architecture,
                effectiveArchitecture=effective_architecture,
                requestedMode=runtime_mode,
                pfdEngine="MANUFACTURER_INPUT",
                pfhEngine="MANUFACTURER_INPUT",
                lambdaT1=None,
                thresholdUsed=None,
                markovTriggered=False,
                heterogeneousChannels=False,
            ),
        )

    if not solver.channels or not solver.voting or not solver.ccf:
        warnings.add(
            "SOLVER_DEFINITION_INCOMPLETE",
            "ERROR",
            "Advanced solver mode requires channels, voting and ccf to be defined.",
            affected="solver",
        )
        return (
            {
                "pfdavg": math.nan,
                "pfh": math.nan,
                "silFromPFD": None,
                "silArchitectural": None,
                "hft": 0,
                "sff": 0.0,
                "pfd_ccf": None,
                "pfd_independent": None,
                "channelResults": [],
            },
            SILBackendSubsystemMeta(
                architecture=architecture,
                effectiveArchitecture=effective_architecture,
                requestedMode=runtime_mode,
                pfdEngine=None,
                pfhEngine=None,
                lambdaT1=None,
                thresholdUsed=None,
                markovTriggered=None,
                heterogeneousChannels=False,
            ),
        )

    return _compute_subsystem(
        name="solver",
        subsystem=solver,
        mission_time=mission_time,
        default_standard=default_standard,
        demand_mode=demand_mode,
        runtime_mode=runtime_mode,
        warnings=warnings,
    )


def _compute_subsystem(
    name: str,
    subsystem: Any,
    mission_time: float,
    default_standard: str,
    demand_mode: str,
    runtime_mode: str,
    warnings: WarningCollector,
) -> tuple[dict[str, Any], SILBackendSubsystemMeta]:
    architecture = subsystem.architecture or _infer_architecture(subsystem.voting["M"], subsystem.voting["N"])
    effective_architecture = _normalize_architecture(architecture, subsystem.voting["M"], subsystem.voting["N"])

    if subsystem.voteType != "S":
        warnings.add(
            "VOTETYPE_NOT_CONSUMED",
            "INFO",
            "voteType is preserved in the backend contract but the SIL backend wrapper currently models the MooN voting only.",
            affected=name,
        )
    if subsystem.ccf.method != "MAX":
        warnings.add(
            "CCF_METHOD_NOT_CONSUMED",
            "INFO",
            "ccf.method is preserved in the backend contract but the SIL backend wrapper currently uses beta and betaD only.",
            affected=name,
        )

    if architecture == "custom":
        warnings.add(
            "CUSTOM_ARCHITECTURE_APPROXIMATED",
            "WARNING",
            "Custom boolean architectures are approximated from voting M/N for the Python backend wrapper.",
            affected=name,
        )
        if subsystem.customExpression:
            warnings.add(
                "CUSTOM_EXPRESSION_NOT_EXECUTED",
                "INFO",
                "The custom boolean expression is preserved in the payload but not executed by the current SIL backend wrapper.",
                affected=name,
            )

    prepared_channels = [
        _prepare_channel(
            channel=channel,
            mission_time=mission_time,
            runtime_mode=runtime_mode,
            warnings=warnings,
            affected_prefix=f"{name}:{channel.id}",
        )
        for channel in subsystem.channels
        if channel.components
    ]

    if not prepared_channels:
        warnings.add(
            "EMPTY_SUBSYSTEM",
            "WARNING",
            "The subsystem contains no populated channels. Returning a neutral result.",
            affected=name,
        )
        return (
            {
                "pfdavg": 0.0,
                "pfh": 0.0,
                "silFromPFD": None,
                "silArchitectural": None,
                "hft": _display_hft(subsystem, subsystem.voting["N"] - subsystem.voting["M"]),
                "sff": 0.0,
                "pfd_ccf": None,
                "pfd_independent": None,
                "channelResults": [],
            },
            SILBackendSubsystemMeta(
                architecture=architecture,
                effectiveArchitecture=effective_architecture,
                requestedMode=runtime_mode,
                pfdEngine="NEUTRAL",
                pfhEngine="NEUTRAL",
                lambdaT1=0.0,
                thresholdUsed=None,
                markovTriggered=False,
                heterogeneousChannels=False,
            ),
        )

    heterogeneity = _detect_channel_heterogeneity(prepared_channels)
    if heterogeneity:
        warnings.add(
            "HETEROGENEOUS_CHANNELS",
            "WARNING",
            "The Python backend wrapper currently reduces non-identical channels to an averaged equivalent subsystem, like the TS engine.",
            affected=name,
        )

    aggregate = _aggregate_subsystem_params(
        subsystem=subsystem,
        channels=prepared_channels,
        mission_time=mission_time,
    )
    standard = subsystem.standard or default_standard
    pfd_value, pfd_engine, pfd_meta = _compute_subsystem_pfd(
        params=aggregate,
        architecture=effective_architecture,
        runtime_mode=runtime_mode,
        warnings=warnings,
        affected=name,
    )
    pfh_value, pfh_engine, pfh_meta = _compute_subsystem_pfh(
        params=aggregate,
        architecture=effective_architecture,
        runtime_mode=runtime_mode,
        warnings=warnings,
        affected=name,
    )
    pfd_independent = None
    pfd_ccf = None
    if runtime_mode != "MARKOV" and not pfd_meta["markovTriggered"]:
        no_ccf = copy.copy(aggregate)
        no_ccf.beta = 0.0
        no_ccf.beta_D = 0.0
        pfd_independent = float(_compute_analytical_pfd(no_ccf, effective_architecture))
        pfd_ccf = max(pfd_value - pfd_independent, 0.0)

    sil_prob = _sil_from_value(pfd_value if demand_mode == "LOW_DEMAND" else pfh_value, demand_mode)
    sff = aggregate.sff if aggregate.lambda_total > 0 else 0.0
    component_type = _worst_character([channel.determined_character for channel in prepared_channels])
    sil_arch = _compute_architectural_sil(
        standard=standard,
        hft=_display_hft(subsystem, aggregate.N - aggregate.M),
        sff=sff,
        component_type=component_type,
    )

    if any(channel.has_partial_stroke for channel in prepared_channels) and aggregate.N > 1:
        warnings.add(
            "PARTIAL_STROKE_REDUNDANCY_LIMIT",
            "WARNING",
            "Partial stroke is modeled at component level, but redundant subsystem aggregation still uses the equivalent-channel approximation.",
            affected=name,
        )

    return (
        {
            "pfdavg": pfd_value,
            "pfh": pfh_value,
            "silFromPFD": sil_prob,
            "silArchitectural": sil_arch,
            "hft": _display_hft(subsystem, aggregate.N - aggregate.M),
            "sff": sff,
            "pfd_ccf": pfd_ccf,
            "pfd_independent": pfd_independent,
            "channelResults": [channel.result for channel in prepared_channels],
        },
        SILBackendSubsystemMeta(
            architecture=architecture,
            effectiveArchitecture=effective_architecture,
            requestedMode=runtime_mode,
            pfdEngine=pfd_engine,
            pfhEngine=pfh_engine,
            lambdaT1=pfd_meta["lambdaT1"],
            thresholdUsed=pfh_meta["thresholdUsed"] if pfh_meta["thresholdUsed"] is not None else pfd_meta["thresholdUsed"],
            markovTriggered=pfh_meta["markovTriggered"] if pfh_meta["markovTriggered"] is not None else pfd_meta["markovTriggered"],
            heterogeneousChannels=heterogeneity,
        ),
    )


def _prepare_channel(
    channel: ChannelDef,
    mission_time: float,
    runtime_mode: str,
    warnings: WarningCollector,
    affected_prefix: str,
) -> PreparedChannel:
    prepared_components = [
        _prepare_component(component, mission_time, runtime_mode, warnings, f"{affected_prefix}:{component.id}")
        for component in channel.components
    ]

    lambda_du = sum(item.rates.lambdaDU for item in prepared_components)
    lambda_dd = sum(item.rates.lambdaDD for item in prepared_components)
    lambda_su = sum(item.rates.lambdaSU for item in prepared_components)
    lambda_sd = sum(item.rates.lambdaSD for item in prepared_components)
    lambda_total = lambda_du + lambda_dd + lambda_su + lambda_sd
    sff = ((lambda_sd + lambda_su + lambda_dd) / lambda_total) if lambda_total > 0 else 0.0

    return PreparedChannel(
        result={
            "channelId": channel.id,
            "pfdavg": sum((item.result["pfdavg"] or 0.0) for item in prepared_components),
            "pfh": sum((item.result["pfh"] or 0.0) for item in prepared_components),
            "componentResults": [item.result for item in prepared_components],
        },
        rates=ResolvedRates(
            lambdaDU=lambda_du,
            lambdaDD=lambda_dd,
            lambdaSU=lambda_su,
            lambdaSD=lambda_sd,
            lambda_total=lambda_total,
            sff=sff,
        ),
        mttr=_weighted_average(
            [item.mttr for item in prepared_components],
            [item.rates.lambdaDD for item in prepared_components],
            fallback=_average([item.mttr for item in prepared_components]),
        ),
        mttr_du=_weighted_average(
            [item.mttr_du for item in prepared_components],
            [item.rates.lambdaDU for item in prepared_components],
            fallback=_average([item.mttr_du for item in prepared_components]),
        ),
        t1=min((item.t1 for item in prepared_components if item.t1 > 0), default=0.0),
        t2=_weighted_average(
            [item.t2 for item in prepared_components],
            [item.rates.lambdaDU for item in prepared_components],
            fallback=mission_time,
        ),
        ptc=_weighted_average(
            [item.ptc for item in prepared_components],
            [item.rates.lambdaDU for item in prepared_components],
            fallback=1.0,
        ),
        determined_character=_worst_character([item.determined_character for item in prepared_components]),
        has_partial_stroke=any(item.uses_partial_stroke for item in prepared_components),
    )


def _prepare_component(
    component: ComponentParams,
    mission_time: float,
    runtime_mode: str,
    warnings: WarningCollector,
    affected: str,
) -> PreparedComponent:
    _collect_component_modeling_warnings(component, warnings, affected)
    rates = _resolve_failure_rates(component)

    no_periodic_test = component.test.type == "NONE"
    t2 = component.test.lifetime if component.test.lifetime and component.test.lifetime > 0 else mission_time
    t1 = component.test.T1 if not no_periodic_test else max(t2, mission_time, 1.0)
    ptc = _clamp(component.test.ptc, 0.0, 1.0)
    mttr = max(component.MTTR, 0.0)
    mttr_du = mttr

    if no_periodic_test:
        warnings.add(
            "NO_PERIODIC_TEST_APPROXIMATED",
            "INFO",
            "Components without periodic test are approximated with an accumulation horizon based on lifetime or mission time in the SIL backend wrapper.",
            affected=affected,
        )

    params = SubsystemParams(
        lambda_DU=rates.lambdaDU,
        lambda_DD=rates.lambdaDD,
        lambda_SD=rates.lambdaSD,
        lambda_SU=rates.lambdaSU,
        lambda_S=rates.lambdaSU + rates.lambdaSD,
        DC=_diagnostic_coverage(rates.lambdaDU, rates.lambdaDD),
        beta=0.0,
        beta_D=0.0,
        MTTR=mttr,
        MTTR_DU=mttr_du,
        T1=t1,
        PTC=ptc,
        T2=max(t2, t1),
        architecture="1oo1",
        M=1,
        N=1,
    )

    pfd_value = _compute_component_pfd(component, params, warnings, affected)
    pfh_value = _compute_component_pfh(params)

    return PreparedComponent(
        result={
            "componentId": component.id,
            "pfdavg": pfd_value,
            "pfh": pfh_value,
            "lambdaDU": rates.lambdaDU,
            "lambdaDD": rates.lambdaDD,
            "lambdaSU": rates.lambdaSU,
            "lambdaSD": rates.lambdaSD,
            "sff": rates.sff,
            "tce": _compute_tce(rates.lambdaDU, rates.lambdaDD, t1, mttr, mttr_du),
        },
        rates=rates,
        mttr=mttr,
        mttr_du=mttr_du,
        t1=t1,
        t2=max(t2, t1),
        ptc=ptc,
        determined_character=component.determinedCharacter,
        uses_partial_stroke=bool(component.partialStroke and component.partialStroke.enabled),
    )


def _compute_component_pfd(component: ComponentParams, params: SubsystemParams, warnings: WarningCollector, affected: str) -> float:
    if component.partialStroke and component.partialStroke.enabled and component.type == "ACTUATOR":
        if params.T1 <= 0:
            warnings.add(
                "PARTIAL_STROKE_IGNORED",
                "WARNING",
                "Partial stroke requires a positive full proof-test interval T1. Falling back to the standard component model.",
                affected=affected,
            )
        else:
            pst_period = params.T1 / max(component.partialStroke.nbTests, 1)
            solver = PSTSolver(
                params,
                T_PST=pst_period,
                c_PST=_clamp(component.partialStroke.efficiency, 0.0, 1.0),
                d_PST=max(component.partialStroke.pi, 0.0),
            )
            return float(solver.compute_pfdavg()["pfdavg_with_pst"])
    elif component.partialStroke and component.partialStroke.enabled:
        warnings.add(
            "PARTIAL_STROKE_IGNORED",
            "WARNING",
            "Partial stroke is only applied on actuator components in the SIL backend wrapper.",
            affected=affected,
        )

    if params.PTC < 1.0:
        effective = copy.copy(params)
        effective.T1 = params.PTC * params.T1 + (1.0 - params.PTC) * params.T2
        effective.PTC = 1.0
        return float(pfd_arch_extended(effective, "1oo1"))

    return float(pfd_arch_extended(params, "1oo1"))


def _compute_component_pfh(params: SubsystemParams) -> float:
    return float(pfh_arch_corrected(params, "1oo1"))


def _compute_subsystem_pfd(
    params: SubsystemParams,
    architecture: str,
    runtime_mode: str,
    warnings: WarningCollector,
    affected: str,
) -> tuple[float, str, dict[str, Any]]:
    if runtime_mode == "MARKOV":
        solver = MarkovSolver(params)
        method = "ode" if len(solver._build_states()) <= 20 else "expm"
        return (
            float(solver.compute_pfdavg(method=method)),
            f"Markov_CTMC_{method.upper()}",
            {"lambdaT1": (params.lambda_DU + params.lambda_DD) * params.T1, "thresholdUsed": None, "markovTriggered": True},
        )

    if runtime_mode == "ANALYTICAL":
        return (
            float(_compute_analytical_pfd(params, architecture)),
            "ANALYTICAL",
            {"lambdaT1": (params.lambda_DU + params.lambda_DD) * params.T1, "thresholdUsed": None, "markovTriggered": False},
        )

    if params.PTC < 1.0:
        warnings.add(
            "AUTO_WITH_IMPERFECT_TEST",
            "INFO",
            "AUTO mode uses the analytical imperfect-test equivalent interval when PTC < 100%.",
            affected=affected,
        )
        return (
            float(_compute_analytical_pfd(params, architecture)),
            "IEC_imperfect_test_equivalent",
            {"lambdaT1": (params.lambda_DU + params.lambda_DD) * params.T1, "thresholdUsed": None, "markovTriggered": False},
        )

    if architecture in STANDARD_ARCHITECTURES:
        routed = route_compute(params, architecture, mode="pfd")
        if routed.get("warning"):
            warnings.add("AUTO_ROUTING_NOTICE", "INFO", routed["warning"], affected=affected)
        return (
            float(routed["result"]),
            str(routed["engine_used"]),
            {
                "lambdaT1": float(routed["lambda_T1"]),
                "thresholdUsed": float(routed["threshold_used"]) if routed["threshold_used"] is not None else None,
                "markovTriggered": bool(routed["markov_triggered"]),
            },
        )

    warnings.add(
        "AUTO_EXTENDED_ARCHITECTURE",
        "INFO",
        "AUTO mode falls back to Markov for extended MooN architectures because sil-py routing thresholds are only calibrated on standard IEC architectures.",
        affected=affected,
    )
    solver = MarkovSolver(params)
    method = "ode" if len(solver._build_states()) <= 20 else "expm"
    return (
        float(solver.compute_pfdavg(method=method)),
        f"Markov_CTMC_{method.upper()}",
        {"lambdaT1": (params.lambda_DU + params.lambda_DD) * params.T1, "thresholdUsed": None, "markovTriggered": True},
    )


def _compute_analytical_pfd(params: SubsystemParams, architecture: str) -> float:
    effective = copy.copy(params)
    if effective.PTC < 1.0:
        effective.T1 = effective.PTC * effective.T1 + (1.0 - effective.PTC) * effective.T2
        effective.PTC = 1.0
    return float(pfd_arch_extended(effective, architecture))


def _compute_subsystem_pfh(
    params: SubsystemParams,
    architecture: str,
    runtime_mode: str,
    warnings: WarningCollector,
    affected: str,
) -> tuple[float, str, dict[str, Any]]:
    pfh_architecture = "1oo2" if architecture == "1oo2D" else architecture
    if architecture == "1oo2D":
        warnings.add(
            "PFH_1OO2D_APPROXIMATION",
            "INFO",
            "sil-py does not expose a dedicated PFH formula for 1oo2D; the backend uses the corrected 1oo2 formulation.",
            affected=affected,
        )

    if runtime_mode == "MARKOV":
        solver = MarkovSolver(params)
        if params.N - params.M >= 2:
            return (
                float(solver.compute_pfh_timedomain()),
                "Markov_CTMC_TD",
                {"thresholdUsed": None, "markovTriggered": True},
            )
        return (
            float(solver.compute_pfh()),
            "Markov_CTMC_SS",
            {"thresholdUsed": None, "markovTriggered": True},
        )

    if runtime_mode == "ANALYTICAL":
        return (
            float(_compute_analytical_pfh(params, pfh_architecture)),
            "ANALYTICAL",
            {"thresholdUsed": None, "markovTriggered": False},
        )

    if pfh_architecture in {"1oo1", "1oo2", "2oo2", "2oo3", "1oo3"}:
        routed = route_compute(params, pfh_architecture, mode="pfh")
        if routed.get("warning"):
            warnings.add("AUTO_ROUTING_NOTICE", "INFO", routed["warning"], affected=affected)
        return (
            float(routed["result"]),
            str(routed["engine_used"]),
            {
                "thresholdUsed": float(routed["threshold_used"]) if routed["threshold_used"] is not None else None,
                "markovTriggered": bool(routed["markov_triggered"]),
            },
        )

    warnings.add(
        "AUTO_EXTENDED_ARCHITECTURE",
        "INFO",
        "AUTO mode falls back to Markov for extended PFH architectures.",
        affected=affected,
    )
    solver = MarkovSolver(params)
    if params.N - params.M >= 2:
        return (
            float(solver.compute_pfh_timedomain()),
            "Markov_CTMC_TD",
            {"thresholdUsed": None, "markovTriggered": True},
        )
    return (
        float(solver.compute_pfh()),
        "Markov_CTMC_SS",
        {"thresholdUsed": None, "markovTriggered": True},
    )


def _compute_analytical_pfh(params: SubsystemParams, architecture: str) -> float:
    if architecture in {"1oo1", "1oo2", "2oo2", "2oo3", "1oo3"}:
        return float(pfh_arch_corrected(params, architecture))
    return float(pfh_moon(params, params.M, params.N))


def _aggregate_subsystem_params(subsystem: Any, channels: list[PreparedChannel], mission_time: float) -> SubsystemParams:
    lambda_du = _average([channel.rates.lambdaDU for channel in channels])
    lambda_dd = _average([channel.rates.lambdaDD for channel in channels])
    lambda_su = _average([channel.rates.lambdaSU for channel in channels])
    lambda_sd = _average([channel.rates.lambdaSD for channel in channels])
    lambda_total = lambda_du + lambda_dd + lambda_su + lambda_sd
    sff = ((lambda_sd + lambda_su + lambda_dd) / lambda_total) if lambda_total > 0 else 0.0

    effective_t1 = _average([channel.t1 for channel in channels]) or mission_time or 1.0

    params = SubsystemParams(
        lambda_DU=lambda_du,
        lambda_DD=lambda_dd,
        lambda_SD=lambda_sd,
        lambda_SU=lambda_su,
        lambda_S=lambda_su + lambda_sd,
        DC=_diagnostic_coverage(lambda_du, lambda_dd),
        beta=subsystem.ccf.beta,
        beta_D=subsystem.ccf.betaD,
        MTTR=_average([channel.mttr for channel in channels]),
        MTTR_DU=_average([channel.mttr_du for channel in channels]),
        T1=effective_t1,
        PTC=_weighted_average(
            [channel.ptc for channel in channels],
            [channel.rates.lambdaDU for channel in channels],
            fallback=1.0,
        ),
        T2=_weighted_average(
            [channel.t2 for channel in channels],
            [channel.rates.lambdaDU for channel in channels],
            fallback=mission_time,
        ),
        architecture=_normalize_architecture(
            subsystem.architecture or _infer_architecture(subsystem.voting["M"], subsystem.voting["N"]),
            subsystem.voting["M"],
            subsystem.voting["N"],
        ),
        M=subsystem.voting["M"],
        N=subsystem.voting["N"],
    )
    params.sff = sff  # runtime attribute for response assembly
    params.lambda_total = lambda_total  # runtime attribute for response assembly
    return params


def _build_curve(
    engine_input: EngineInput,
    subsystem_meta: dict[str, SILBackendSubsystemMeta],
    warnings: WarningCollector,
    points: int,
) -> list[dict[str, float]] | None:
    series: list[list[dict[str, float]]] = []
    for name, subsystem in [("sensors", engine_input.sif.sensors), ("actuators", engine_input.sif.actuators)]:
        arch = subsystem_meta[name].effectiveArchitecture
        if arch not in STANDARD_ARCHITECTURES:
            warnings.add(
                "CURVE_UNAVAILABLE_FOR_ARCHITECTURE",
                "INFO",
                "Instantaneous PFD curves are currently only exposed for standard IEC architectures in the backend wrapper.",
                affected=name,
            )
            return None

        aggregate = _aggregate_subsystem_params(
            subsystem=subsystem,
            channels=[
                _prepare_channel(channel, engine_input.sif.missionTime, "AUTO", warnings, f"curve:{name}:{channel.id}")
                for channel in subsystem.channels
                if channel.components
            ],
            mission_time=engine_input.sif.missionTime,
        )
        curve = pfd_instantaneous(aggregate, arch=arch, n_points=points)
        series.append([
            {"t": float(t), "pfd": float(pfd)}
            for t, pfd in zip(curve.t, curve.pfd_t)
        ])

    if not series:
        return None

    combined: list[dict[str, float]] = []
    running_integral = 0.0
    previous_t = None
    previous_pfd = None
    for index in range(len(series[0])):
        t = series[0][index]["t"]
        pfd_total = 1.0
        for subsystem_curve in series:
            pfd_total *= (1.0 - subsystem_curve[index]["pfd"])
        pfd_total = 1.0 - pfd_total

        if previous_t is not None and previous_pfd is not None:
            running_integral += (previous_pfd + pfd_total) * (t - previous_t) / 2.0
            pfd_avg = running_integral / max(t, 1e-12)
        else:
            pfd_avg = pfd_total

        combined.append({"t": t, "pfd": pfd_total, "pfdavg": pfd_avg})
        previous_t = t
        previous_pfd = pfd_total

    return combined


def _resolve_failure_rates(component: ComponentParams) -> ResolvedRates:
    failure_rate = component.failureRate
    if failure_rate.mode == "FACTORISED":
        lambda_d = failure_rate.lambda_value * failure_rate.lambdaD_ratio
        lambda_s = failure_rate.lambda_value * (1.0 - failure_rate.lambdaD_ratio)
        lambda_du = lambda_d * (1.0 - failure_rate.DCd)
        lambda_dd = lambda_d * failure_rate.DCd
        lambda_su = lambda_s * (1.0 - failure_rate.DCs)
        lambda_sd = lambda_s * failure_rate.DCs
        lambda_total = failure_rate.lambda_value
    else:
        lambda_du = failure_rate.lambdaDU
        lambda_dd = failure_rate.lambdaDD
        lambda_su = failure_rate.lambdaSU
        lambda_sd = failure_rate.lambdaSD
        lambda_total = lambda_du + lambda_dd + lambda_su + lambda_sd

    sff = ((lambda_sd + lambda_su + lambda_dd) / lambda_total) if lambda_total > 0 else 0.0
    return ResolvedRates(
        lambdaDU=lambda_du,
        lambdaDD=lambda_dd,
        lambdaSU=lambda_su,
        lambdaSD=lambda_sd,
        lambda_total=lambda_total,
        sff=sff,
    )


def _collect_component_modeling_warnings(component: ComponentParams, warnings: WarningCollector, affected: str) -> None:
    test = component.test
    if test.T0 not in (0, 0.0):
        warnings.add("TEST_T0_IGNORED", "INFO", "T0 is accepted by the backend contract but not yet consumed by sil-py subsystem formulas.", affected=affected)
    if test.sigma not in (0, 1.0):
        warnings.add("TEST_SIGMA_IGNORED", "INFO", "Sigma is preserved in the backend contract but not yet consumed by the sil-py subsystem wrapper.", affected=affected)
    if test.gamma not in (0, 0.0):
        warnings.add("TEST_GAMMA_IGNORED", "INFO", "Gamma is accepted but not currently consumed by the SIL backend wrapper.", affected=affected)
    if test.lambdaStar not in (None, 0, 0.0):
        warnings.add("TEST_LAMBDASTAR_IGNORED", "INFO", "lambdaStar is accepted but not currently consumed by the SIL backend wrapper.", affected=affected)
    if test.omega1 not in (0, 0.0) or test.omega2 not in (0, 0.0):
        warnings.add("TEST_OMEGA_IGNORED", "INFO", "omega1/omega2 are preserved in the backend contract but not yet consumed by the sil-py subsystem wrapper.", affected=affected)
    if component.partialStroke and component.partialStroke.enabled and component.type != "ACTUATOR":
        warnings.add("PARTIAL_STROKE_NON_ACTUATOR", "WARNING", "Partial stroke was provided on a non-actuator component and will be ignored.", affected=affected)


def _display_hft(subsystem: Any, default_hft: int) -> int:
    if subsystem.architecture == "custom" and subsystem.manualHFT is not None:
        return subsystem.manualHFT
    return default_hft


def _compute_architectural_sil(standard: str, hft: int, sff: float, component_type: str) -> int | None:
    hft_idx = max(min(hft, 2), 0)

    if sff < 0.60:
        band = "lt60"
    elif sff < 0.90:
        band = "60_90"
    elif sff < 0.99:
        band = "90_99"
    else:
        band = "gte99"

    route1h_type_a = {
        "lt60": [1, 2, 3],
        "60_90": [2, 3, 4],
        "90_99": [3, 4, 4],
        "gte99": [3, 4, 4],
    }
    route1h_type_b = {
        "lt60": [0, 1, 2],
        "60_90": [1, 2, 3],
        "90_99": [2, 3, 4],
        "gte99": [3, 4, 4],
    }

    if standard == "IEC61508_ROUTE2H":
        sil = [2, 3, 4][hft_idx]
        return sil if sil > 0 else None

    if standard == "IEC61511_2016":
        sil = [2, 3, 4][hft_idx]
        return sil if sil > 0 else None

    if component_type == "TYPE_A":
        sil = route1h_type_a[band][hft_idx]
    elif component_type == "TYPE_B":
        sil = route1h_type_b[band][hft_idx]
    else:
        sil = max(0, route1h_type_b[band][hft_idx] - 1)

    return sil if sil > 0 else None


def _with_contribution(subsystem: dict[str, Any], total: float, demand_mode: str) -> dict[str, Any]:
    relevant = subsystem["pfdavg"] if demand_mode == "LOW_DEMAND" else subsystem["pfh"]
    contribution = ((relevant or 0.0) / total * 100.0) if total > 0 else 0.0
    next_subsystem = dict(subsystem)
    next_subsystem["contributionPct"] = contribution
    return next_subsystem


def _combine_series_pfd(values: list[float]) -> float:
    total = sum(values)
    if total <= 0.05:
        return total
    combined = 1.0
    for value in values:
        combined *= (1.0 - value)
    return 1.0 - combined


def _sil_from_value(value: float, demand_mode: str) -> int | None:
    if demand_mode == "LOW_DEMAND":
        if value < 1e-4:
            return 4
        if value < 1e-3:
            return 3
        if value < 1e-2:
            return 2
        if value < 1e-1:
            return 1
        return None

    if value < 1e-8:
        return 4
    if value < 1e-7:
        return 3
    if value < 1e-6:
        return 2
    if value < 1e-5:
        return 1
    return None


def _min_optional(values: list[int | None]) -> int | None:
    valid = [value for value in values if value is not None]
    return min(valid) if valid else None


def _compute_tce(lambda_du: float, lambda_dd: float, t1: float, mttr: float, mttr_du: float) -> float:
    lambda_d = lambda_du + lambda_dd
    if lambda_d <= 0:
        return 0.0
    return (lambda_du * (t1 / 2.0 + mttr_du) + lambda_dd * mttr) / lambda_d


def _average(values: list[float]) -> float:
    filtered = [value for value in values if math.isfinite(value)]
    if not filtered:
        return 0.0
    return sum(filtered) / len(filtered)


def _weighted_average(values: list[float], weights: list[float], fallback: float) -> float:
    total_weight = sum(weight for weight in weights if weight > 0)
    if total_weight <= 0:
        return fallback
    return sum(value * weight for value, weight in zip(values, weights) if weight > 0) / total_weight


def _diagnostic_coverage(lambda_du: float, lambda_dd: float) -> float:
    total = lambda_du + lambda_dd
    return lambda_dd / total if total > 0 else 0.0


def _clamp(value: float, lower: float, upper: float) -> float:
    return max(lower, min(value, upper))


def _worst_character(values: list[str]) -> str:
    if "NON_TYPE_AB" in values:
        return "NON_TYPE_AB"
    if "TYPE_B" in values:
        return "TYPE_B"
    return "TYPE_A"


def _detect_channel_heterogeneity(channels: list[PreparedChannel]) -> bool:
    lambda_du_values = [channel.rates.lambdaDU for channel in channels if channel.rates.lambdaDU > 0]
    t1_values = [channel.t1 for channel in channels if channel.t1 > 0]
    if _spread(lambda_du_values) > 0.2:
        return True
    if _spread(t1_values) > 0.2:
        return True
    return False


def _spread(values: list[float]) -> float:
    if len(values) < 2:
        return 0.0
    low = min(values)
    high = max(values)
    if low <= 0:
        return 0.0 if high <= 0 else 1.0
    return (high - low) / low


def _infer_architecture(m_value: int, n_value: int) -> str:
    return f"{m_value}oo{n_value}"


def _normalize_architecture(architecture: str, m_value: int, n_value: int) -> str:
    if architecture == "custom":
        return _infer_architecture(m_value, n_value)
    return architecture or _infer_architecture(m_value, n_value)
