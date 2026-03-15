from __future__ import annotations

import io
import json
import math
import re
import textwrap
from datetime import datetime, timezone
from typing import Any

from fastapi import Response
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    Paragraph,
    Preformatted,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
    PageBreak,
)
from sil_engine import SubsystemParams
from sil_engine.pst import PSTSolver

from app.schemas import SILComputeRequest, SILReportMeta, SILReportRequest
from app.services.sil_service import (
    APP_VERSION,
    STANDARD_ARCHITECTURES,
    WarningCollector,
    _aggregate_subsystem_params,
    _compute_architectural_sil,
    _compute_subsystem_pfd,
    _compute_subsystem_pfh,
    _compute_tce,
    _diagnostic_coverage,
    _display_hft,
    _prepare_channel,
    _prepare_component,
    _resolve_failure_rates,
    _sil_from_value,
    _worst_character,
    compute_sil,
)

PAGE_MARGIN = 16 * mm
CONTENT_WIDTH = A4[0] - 2 * PAGE_MARGIN
PRISM_NAVY = colors.HexColor("#0F2742")
PRISM_CYAN = colors.HexColor("#0EA5E9")
PRISM_ORANGE = colors.HexColor("#F97316")
PRISM_SLATE = colors.HexColor("#64748B")
PRISM_LINE = colors.HexColor("#D7E1EA")
PRISM_SURFACE = colors.HexColor("#F7FAFC")
PRISM_SUCCESS = colors.HexColor("#16A34A")
PRISM_DANGER = colors.HexColor("#DC2626")
PRISM_AMBER = colors.HexColor("#D97706")


def create_sil_report_pdf_response(payload: SILReportRequest) -> Response:
    pdf_bytes, filename = build_sil_report_pdf(payload)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "no-store",
        },
    )


def build_sil_report_pdf(payload: SILReportRequest) -> tuple[bytes, str]:
    compute_request = SILComputeRequest(input=payload.input, runtime=payload.runtime)
    compute_response = compute_sil(compute_request)
    context = _build_report_context(payload, compute_response.model_dump(by_alias=True))

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=PAGE_MARGIN,
        rightMargin=PAGE_MARGIN,
        topMargin=PAGE_MARGIN,
        bottomMargin=PAGE_MARGIN,
        title=context["meta"]["title"],
        author="PRISM backend SIL engine",
    )

    styles = _build_styles()
    story = _build_story(context, styles)
    doc.build(
        story,
        onFirstPage=lambda canvas, document: _draw_page_frame(canvas, document, context, first_page=True),
        onLaterPages=lambda canvas, document: _draw_page_frame(canvas, document, context, first_page=False),
    )

    file_name = _build_filename(context["meta"])
    return buffer.getvalue(), file_name


def _build_report_context(payload: SILReportRequest, response: dict[str, Any]) -> dict[str, Any]:
    generated_at = datetime.now(timezone.utc)
    meta = _merge_meta(payload.report, payload.input, response, generated_at)
    warnings = WarningCollector()
    subsystem_traces = {
        "sensors": _build_subsystem_trace(
            name="Sensors",
            key="sensors",
            subsystem=payload.input.sif.sensors,
            mission_time=payload.input.sif.missionTime,
            default_standard=payload.input.options.standard,
            demand_mode=payload.input.sif.demandMode,
            runtime_mode=payload.runtime.calculationMode,
            warnings=warnings,
        ),
        "solver": _build_solver_trace(
            solver=payload.input.sif.solver,
            mission_time=payload.input.sif.missionTime,
            default_standard=payload.input.options.standard,
            demand_mode=payload.input.sif.demandMode,
            runtime_mode=payload.runtime.calculationMode,
            warnings=warnings,
        ),
        "actuators": _build_subsystem_trace(
            name="Final Elements",
            key="actuators",
            subsystem=payload.input.sif.actuators,
            mission_time=payload.input.sif.missionTime,
            default_standard=payload.input.options.standard,
            demand_mode=payload.input.sif.demandMode,
            runtime_mode=payload.runtime.calculationMode,
            warnings=warnings,
        ),
    }

    global_trace = _build_global_trace(payload, response, subsystem_traces)
    payload_snapshot = payload.input.model_dump(by_alias=True)
    report_snapshot = payload.report.model_dump(by_alias=True)

    return {
        "generatedAt": generated_at,
        "meta": meta,
        "request": payload.model_dump(by_alias=True),
        "input": payload_snapshot,
        "reportMeta": report_snapshot,
        "response": response,
        "trace": {
            "subsystems": subsystem_traces,
            "global": global_trace,
        },
        "warnings": [warning.model_dump() for warning in warnings.items] + list(response["result"]["warnings"]),
    }


def _merge_meta(
    report: SILReportMeta,
    input_payload: Any,
    response: dict[str, Any],
    generated_at: datetime,
) -> dict[str, Any]:
    title = report.title or "PRISM SIL Backend Calculation Dossier"
    sif_number = report.sifNumber or input_payload.sif.id
    doc_ref = report.docRef or f"{report.projectRef or 'PRJ'}-{sif_number}-BACKEND-SIL"
    version = report.version or f"Engine {APP_VERSION}"
    target_sil = report.targetSIL
    achieved = response["result"]["silAchieved"]

    return {
        "title": title,
        "docRef": doc_ref,
        "version": version,
        "projectName": report.projectName or "Unnamed project",
        "projectRef": report.projectRef or "",
        "sifNumber": sif_number,
        "sifTitle": report.sifTitle or "",
        "targetSIL": target_sil,
        "achievedSIL": achieved,
        "preparedBy": report.preparedBy or "",
        "checkedBy": report.checkedBy or "",
        "approvedBy": report.approvedBy or "",
        "scope": report.scope or "",
        "hazardDescription": report.hazardDescription or "",
        "assumptions": report.assumptions or "",
        "recommendations": report.recommendations or "",
        "confidentialityLabel": report.confidentialityLabel or "Internal / Restricted",
        "showPFDChart": report.showPFDChart,
        "showSubsystemTable": report.showSubsystemTable,
        "showComponentTable": report.showComponentTable,
        "showComplianceMatrix": report.showComplianceMatrix,
        "showAssumptions": report.showAssumptions,
        "showRecommendations": report.showRecommendations,
        "demandMode": input_payload.sif.demandMode,
        "requestedMode": input_payload.options.standard,
        "generatedAtLabel": generated_at.strftime("%d %B %Y %H:%M UTC"),
    }


def _build_subsystem_trace(
    name: str,
    key: str,
    subsystem: Any,
    mission_time: float,
    default_standard: str,
    demand_mode: str,
    runtime_mode: str,
    warnings: WarningCollector,
) -> dict[str, Any]:
    channels: list[dict[str, Any]] = []
    prepared_channels = []

    for channel in subsystem.channels:
        if not channel.components:
            continue
        prepared_channel = _prepare_channel(channel, mission_time, runtime_mode, warnings, f"report:{key}:{channel.id}")
        prepared_channels.append(prepared_channel)
        prepared_components = [
            _prepare_component(component, mission_time, runtime_mode, warnings, f"report:{key}:{channel.id}:{component.id}")
            for component in channel.components
        ]
        component_rows = [
            _build_component_trace(component, prepared, mission_time)
            for component, prepared in zip(channel.components, prepared_components)
        ]
        channel_rates = {
            "lambdaDU": sum(item["resolvedRates"]["lambdaDU"] for item in component_rows),
            "lambdaDD": sum(item["resolvedRates"]["lambdaDD"] for item in component_rows),
            "lambdaSU": sum(item["resolvedRates"]["lambdaSU"] for item in component_rows),
            "lambdaSD": sum(item["resolvedRates"]["lambdaSD"] for item in component_rows),
        }
        channels.append(
            {
                "id": channel.id,
                "pfdavg": prepared_channel.result["pfdavg"],
                "pfh": prepared_channel.result["pfh"],
                "components": component_rows,
                "aggregation": [
                    f"PFD_channel = sum(component PFDavg) = {_fmt_terms([item['result']['pfdavg'] for item in component_rows])} = {_fmt(prepared_channel.result['pfdavg'])}",
                    f"PFH_channel = sum(component PFH) = {_fmt_terms([item['result']['pfh'] for item in component_rows])} = {_fmt(prepared_channel.result['pfh'])}",
                    f"lambdaDU_channel = sum(lambdaDU_i) = {_fmt(channel_rates['lambdaDU'])}",
                    f"lambdaDD_channel = sum(lambdaDD_i) = {_fmt(channel_rates['lambdaDD'])}",
                ],
            }
        )

    if not prepared_channels:
        return {
            "name": name,
            "kind": key,
            "summary": {
                "pfdavg": 0.0,
                "pfh": 0.0,
                "silFromPFD": None,
                "silArchitectural": None,
                "hft": 0,
                "sff": 0.0,
            },
            "routing": {
                "requestedMode": runtime_mode,
                "pfdEngine": "NEUTRAL",
                "pfhEngine": "NEUTRAL",
                "reason": "No populated channel was provided. The subsystem was neutralized.",
            },
            "channels": [],
            "equations": [],
        }

    aggregate = _aggregate_subsystem_params(subsystem, prepared_channels, mission_time)
    architecture = aggregate.architecture
    standard = subsystem.standard or default_standard
    pfd_value, pfd_engine, pfd_meta = _compute_subsystem_pfd(aggregate, architecture, runtime_mode, warnings, key)
    pfh_value, pfh_engine, pfh_meta = _compute_subsystem_pfh(aggregate, architecture, runtime_mode, warnings, key)
    component_type = _worst_character([prepared_channel.determined_character for prepared_channel in prepared_channels])
    hft = _display_hft(subsystem, aggregate.N - aggregate.M)
    sil_arch = _compute_architectural_sil(standard, hft, aggregate.sff, component_type)
    sil_prob = _sil_from_value(pfd_value if demand_mode == "LOW_DEMAND" else pfh_value, demand_mode)

    routing = {
        "requestedMode": runtime_mode,
        "architecture": subsystem.architecture or architecture,
        "effectiveArchitecture": architecture,
        "pfdEngine": pfd_engine,
        "pfhEngine": pfh_engine,
        "lambdaT1": pfd_meta["lambdaT1"],
        "thresholdUsed": pfd_meta["thresholdUsed"] if pfd_meta["thresholdUsed"] is not None else pfh_meta["thresholdUsed"],
        "markovTriggered": pfd_meta["markovTriggered"] or pfh_meta["markovTriggered"],
        "reason": _describe_route(runtime_mode, architecture, aggregate, pfd_engine, pfh_engine, pfd_meta, pfh_meta),
    }

    equations = [
        f"lambdaDU_eq = avg(channel lambdaDU) = {_fmt(aggregate.lambda_DU)}",
        f"lambdaDD_eq = avg(channel lambdaDD) = {_fmt(aggregate.lambda_DD)}",
        f"DC_eq = lambdaDD / (lambdaDU + lambdaDD) = {_fmt(_diagnostic_coverage(aggregate.lambda_DU, aggregate.lambda_DD), digits=4)}",
        f"SFF_eq = (lambdaSD + lambdaSU + lambdaDD) / lambda_total = {_fmt(aggregate.sff, digits=4)}",
        f"T1_eq = avg(channel T1) = {_fmt_hours(aggregate.T1)}",
        f"PTC_eq = weighted_avg(channel PTC, lambdaDU) = {_fmt(aggregate.PTC, digits=4)}",
        f"PFD_{key} = {pfd_engine}({architecture}) = {_fmt(pfd_value)}",
        f"PFH_{key} = {pfh_engine}({architecture}) = {_fmt(pfh_value)}",
        f"SIL_prob_{key} = {_fmt_sil(sil_prob)} ; SIL_arch_{key} = {_fmt_sil(sil_arch)}",
    ]

    return {
        "name": name,
        "kind": key,
        "summary": {
            "pfdavg": pfd_value,
            "pfh": pfh_value,
            "silFromPFD": sil_prob,
            "silArchitectural": sil_arch,
            "hft": hft,
            "sff": aggregate.sff,
            "componentType": component_type,
        },
        "routing": routing,
        "aggregate": {
            "lambdaDU": aggregate.lambda_DU,
            "lambdaDD": aggregate.lambda_DD,
            "lambdaSU": aggregate.lambda_SU,
            "lambdaSD": aggregate.lambda_SD,
            "beta": aggregate.beta,
            "betaD": aggregate.beta_D,
            "dc": _diagnostic_coverage(aggregate.lambda_DU, aggregate.lambda_DD),
            "t1": aggregate.T1,
            "t2": aggregate.T2,
            "ptc": aggregate.PTC,
            "mttr": aggregate.MTTR,
            "mttrDu": aggregate.MTTR_DU,
            "m": aggregate.M,
            "n": aggregate.N,
        },
        "channels": channels,
        "equations": equations,
    }


def _build_solver_trace(
    solver: Any,
    mission_time: float,
    default_standard: str,
    demand_mode: str,
    runtime_mode: str,
    warnings: WarningCollector,
) -> dict[str, Any]:
    if solver.mode == "SIMPLE":
        sil_prob = _sil_from_value((solver.pfd or 0.0) if demand_mode == "LOW_DEMAND" else (solver.pfh or 0.0), demand_mode)
        return {
            "name": "Logic Solver",
            "kind": "solver",
            "summary": {
                "pfdavg": solver.pfd or 0.0,
                "pfh": solver.pfh or 0.0,
                "silFromPFD": sil_prob,
                "silArchitectural": None,
                "hft": 0,
                "sff": 0.0,
            },
            "routing": {
                "requestedMode": runtime_mode,
                "architecture": solver.architecture or "1oo1",
                "effectiveArchitecture": solver.architecture or "1oo1",
                "pfdEngine": "MANUFACTURER_INPUT",
                "pfhEngine": "MANUFACTURER_INPUT",
                "lambdaT1": None,
                "thresholdUsed": None,
                "markovTriggered": False,
                "reason": "The logic solver is configured in SIMPLE mode. The backend uses the PFD/PFH values provided by the frontend as authoritative manufacturer inputs.",
            },
            "channels": [],
            "equations": [
                f"PFD_solver = manufacturer input = {_fmt(solver.pfd or 0.0)}",
                f"PFH_solver = manufacturer input = {_fmt(solver.pfh or 0.0)}",
                f"SIL_prob_solver = {_fmt_sil(sil_prob)}",
            ],
        }

    return _build_subsystem_trace(
        name="Logic Solver",
        key="solver",
        subsystem=solver,
        mission_time=mission_time,
        default_standard=default_standard,
        demand_mode=demand_mode,
        runtime_mode=runtime_mode,
        warnings=warnings,
    )


def _build_component_trace(component: Any, prepared: Any, mission_time: float) -> dict[str, Any]:
    rates = _resolve_failure_rates(component)
    tce = _compute_tce(rates.lambdaDU, rates.lambdaDD, prepared.t1, prepared.mttr, prepared.mttr_du)
    formulas = []

    if component.failureRate.mode == "FACTORISED":
        factor = component.failureRate
        formulas.extend([
            f"lambdaD = lambda * lambdaD_ratio = {_fmt(factor.lambda_value)} x {_fmt(factor.lambdaD_ratio, digits=4)} = {_fmt((factor.lambda_value * factor.lambdaD_ratio))}",
            f"lambdaDU = lambdaD x (1 - DCd) = {_fmt(rates.lambdaDU)}",
            f"lambdaDD = lambdaD x DCd = {_fmt(rates.lambdaDD)}",
            f"lambdaSU = lambdaS x (1 - DCs) = {_fmt(rates.lambdaSU)}",
            f"lambdaSD = lambdaS x DCs = {_fmt(rates.lambdaSD)}",
        ])
    else:
        formulas.extend([
            f"lambda_total = lambdaDU + lambdaDD + lambdaSU + lambdaSD = {_fmt(rates.lambda_total)}",
            f"SFF = (lambdaSD + lambdaSU + lambdaDD) / lambda_total = {_fmt(rates.sff, digits=4)}",
        ])

    if component.test.type == "NONE":
        formulas.append(f"T1_eff = max(lifetime, missionTime, 1h) = {_fmt_hours(prepared.t1)}")
    elif component.test.ptc < 1.0:
        equivalent_t1 = component.test.ptc * component.test.T1 + (1.0 - component.test.ptc) * prepared.t2
        formulas.append(
            f"T_eq = PTC x T1 + (1 - PTC) x T2 = {_fmt(component.test.ptc, digits=4)} x {_fmt_hours(component.test.T1)} + "
            f"{_fmt(1.0 - component.test.ptc, digits=4)} x {_fmt_hours(prepared.t2)} = {_fmt_hours(equivalent_t1)}"
        )

    pfd_method = "pfd_arch_extended(1oo1)"
    pst_summary = None
    if component.partialStroke and component.partialStroke.enabled and component.type == "ACTUATOR":
        pst_period = prepared.t1 / max(component.partialStroke.nbTests, 1)
        params = SubsystemParams(
            lambda_DU=rates.lambdaDU,
            lambda_DD=rates.lambdaDD,
            lambda_SD=rates.lambdaSD,
            lambda_SU=rates.lambdaSU,
            lambda_S=rates.lambdaSU + rates.lambdaSD,
            DC=_diagnostic_coverage(rates.lambdaDU, rates.lambdaDD),
            beta=0.0,
            beta_D=0.0,
            MTTR=prepared.mttr,
            MTTR_DU=prepared.mttr_du,
            T1=prepared.t1,
            PTC=prepared.ptc,
            T2=prepared.t2,
            architecture="1oo1",
            M=1,
            N=1,
        )
        pst = PSTSolver(
            params,
            T_PST=pst_period,
            c_PST=max(min(component.partialStroke.efficiency, 1.0), 0.0),
            d_PST=max(component.partialStroke.pi, 0.0),
        ).compute_pfdavg()
        pst_summary = pst
        pfd_method = "PSTSolver.compute_pfdavg()"
        formulas.append(
            f"PST route: T_PST = T1 / n = {_fmt_hours(prepared.t1)} / {max(component.partialStroke.nbTests, 1)} = {_fmt_hours(pst_period)}"
        )

    formulas.extend([
        f"PFD_component = {pfd_method} = {_fmt(prepared.result['pfdavg'])}",
        f"PFH_component = pfh_arch_corrected(1oo1) = {_fmt(prepared.result['pfh'])}",
        f"TCE = (lambdaDU x (T1/2 + MTTR_DU) + lambdaDD x MTTR) / (lambdaDU + lambdaDD) = {_fmt_hours(tce)}",
    ])

    return {
        "id": component.id,
        "tag": component.tag,
        "type": component.type,
        "determinedCharacter": component.determinedCharacter,
        "resolvedRates": {
            "lambdaDU": rates.lambdaDU,
            "lambdaDD": rates.lambdaDD,
            "lambdaSU": rates.lambdaSU,
            "lambdaSD": rates.lambdaSD,
            "lambdaTotal": rates.lambda_total,
            "sff": rates.sff,
        },
        "test": {
            "type": component.test.type,
            "t1": prepared.t1,
            "t2": prepared.t2,
            "ptc": prepared.ptc,
            "mttr": prepared.mttr,
            "missionTime": mission_time,
        },
        "result": {
            "pfdavg": prepared.result["pfdavg"],
            "pfh": prepared.result["pfh"],
            "tce": tce,
        },
        "pst": pst_summary,
        "formulas": formulas,
    }


def _build_global_trace(payload: SILReportRequest, response: dict[str, Any], subsystems: dict[str, dict[str, Any]]) -> dict[str, Any]:
    sensor_pfd = subsystems["sensors"]["summary"]["pfdavg"] or 0.0
    solver_pfd = subsystems["solver"]["summary"]["pfdavg"] or 0.0
    actuator_pfd = subsystems["actuators"]["summary"]["pfdavg"] or 0.0
    total_sum = sensor_pfd + solver_pfd + actuator_pfd
    additive_rule = total_sum <= 0.05

    equations = [
        (
            "PFD_total = "
            + ("PFD_sensors + PFD_solver + PFD_actuators" if additive_rule else "1 - Π(1 - PFD_i)")
            + f" = {_fmt(response['result']['pfdavg'])}"
        ),
        (
            "PFH_total = PFH_sensors + PFH_solver + PFH_actuators = "
            f"{_fmt(subsystems['sensors']['summary']['pfh'])} + {_fmt(subsystems['solver']['summary']['pfh'])} + {_fmt(subsystems['actuators']['summary']['pfh'])} = {_fmt(response['result']['pfh'])}"
        ),
        f"SIL_prob = {_fmt_sil(response['result']['silFromPFD'])}",
        (
            "SIL_achieved = min(SIL_prob, SIL_arch_sensors, SIL_arch_solver, SIL_arch_actuators) = "
            f"{_fmt_sil(response['result']['silAchieved'])}"
        ),
    ]

    return {
        "additiveRule": additive_rule,
        "equations": equations,
        "pass": (
            payload.report.targetSIL is not None
            and response["result"]["silAchieved"] is not None
            and response["result"]["silAchieved"] >= payload.report.targetSIL
        ),
    }


def _describe_route(
    runtime_mode: str,
    architecture: str,
    aggregate: SubsystemParams,
    pfd_engine: str,
    pfh_engine: str,
    pfd_meta: dict[str, Any],
    pfh_meta: dict[str, Any],
) -> str:
    if runtime_mode == "MARKOV":
        pfh_variant = "time-domain" if aggregate.N - aggregate.M >= 2 else "steady-state"
        return (
            f"MARKOV was forced by the caller. PFD used {pfd_engine}; PFH used {pfh_engine} "
            f"with the {pfh_variant} Markov branch selected from redundancy order p = N-M = {aggregate.N - aggregate.M}."
        )

    if runtime_mode == "ANALYTICAL":
        return (
            f"ANALYTICAL was forced by the caller. The backend bypassed automatic routing and evaluated "
            f"the analytical formulas directly for architecture {architecture}."
        )

    if aggregate.PTC < 1.0:
        return (
            f"AUTO stayed on the analytical imperfect-test equivalent interval because PTC = {_fmt(aggregate.PTC, digits=4)} < 1.0. "
            "This preserves explicit test coverage in the wrapper before invoking the analytical formula."
        )

    if architecture in STANDARD_ARCHITECTURES:
        lambda_t1 = pfd_meta["lambdaT1"]
        threshold = pfd_meta["thresholdUsed"] if pfd_meta["thresholdUsed"] is not None else pfh_meta["thresholdUsed"]
        threshold_text = _fmt(threshold) if threshold is not None else "n/a"
        return (
            f"AUTO routing evaluated lambdaD x T1 = {_fmt(lambda_t1)} against threshold {threshold_text} for architecture {architecture}. "
            f"PFD selected {pfd_engine}; PFH selected {pfh_engine}."
        )

    return (
        f"AUTO fell back to Markov-compatible logic because architecture {architecture} is outside the calibrated standard IEC routing table. "
        f"PFD selected {pfd_engine}; PFH selected {pfh_engine}."
    )


def _build_styles() -> dict[str, ParagraphStyle]:
    sample = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "PrismTitle",
            parent=sample["Title"],
            fontName="Helvetica-Bold",
            fontSize=22,
            leading=26,
            textColor=PRISM_NAVY,
            spaceAfter=6,
        ),
        "subtitle": ParagraphStyle(
            "PrismSubtitle",
            parent=sample["BodyText"],
            fontName="Helvetica",
            fontSize=10.5,
            leading=14,
            textColor=PRISM_SLATE,
            spaceAfter=8,
        ),
        "section": ParagraphStyle(
            "PrismSection",
            parent=sample["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=13,
            leading=16,
            textColor=PRISM_NAVY,
            spaceBefore=8,
            spaceAfter=6,
        ),
        "subsection": ParagraphStyle(
            "PrismSubsection",
            parent=sample["Heading3"],
            fontName="Helvetica-Bold",
            fontSize=10.5,
            leading=13,
            textColor=PRISM_NAVY,
            spaceBefore=4,
            spaceAfter=4,
        ),
        "body": ParagraphStyle(
            "PrismBody",
            parent=sample["BodyText"],
            fontName="Helvetica",
            fontSize=8.6,
            leading=11.2,
            textColor=colors.HexColor("#102238"),
            alignment=TA_LEFT,
        ),
        "muted": ParagraphStyle(
            "PrismMuted",
            parent=sample["BodyText"],
            fontName="Helvetica",
            fontSize=7.6,
            leading=10,
            textColor=PRISM_SLATE,
        ),
        "small": ParagraphStyle(
            "PrismSmall",
            parent=sample["BodyText"],
            fontName="Helvetica",
            fontSize=7.2,
            leading=9.2,
            textColor=colors.HexColor("#102238"),
        ),
        "mono": ParagraphStyle(
            "PrismMono",
            parent=sample["Code"],
            fontName="Courier",
            fontSize=6.4,
            leading=8.0,
            textColor=colors.HexColor("#102238"),
        ),
        "kpi": ParagraphStyle(
            "PrismKpi",
            parent=sample["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=15,
            leading=18,
            textColor=PRISM_NAVY,
            alignment=TA_CENTER,
        ),
        "kpiLabel": ParagraphStyle(
            "PrismKpiLabel",
            parent=sample["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=7,
            leading=9,
            textColor=PRISM_SLATE,
            alignment=TA_CENTER,
        ),
        "right": ParagraphStyle(
            "PrismRight",
            parent=sample["BodyText"],
            fontName="Helvetica",
            fontSize=7.6,
            leading=9.6,
            textColor=PRISM_SLATE,
            alignment=TA_RIGHT,
        ),
    }


def _build_story(context: dict[str, Any], styles: dict[str, ParagraphStyle]) -> list[Any]:
    story: list[Any] = []
    meta = context["meta"]
    response = context["response"]

    story.extend(_cover_page(context, styles))
    story.append(PageBreak())

    story.append(Paragraph("1. Calculation Pedigree", styles["section"]))
    story.append(Paragraph(
        "This dossier is generated by the backend SIL engine. It captures the normalized payload received from the frontend, the routing decisions actually applied by the backend wrapper, the intermediate equations assembled by the wrapper, and the resulting SIL figures returned by the engine.",
        styles["body"],
    ))
    story.append(Spacer(1, 4))
    story.append(_two_column_key_table([
        ("Project", meta["projectName"]),
        ("SIF", f"{meta['sifNumber']} {('— ' + meta['sifTitle']) if meta['sifTitle'] else ''}"),
        ("Demand mode", meta["demandMode"]),
        ("Calculation mode", response["backend"]["requestedMode"]),
        ("Backend service", response["backend"]["service"]),
        ("Backend version", response["backend"]["serviceVersion"]),
        ("Input digest", response["backend"]["inputDigest"]),
        ("Generated at", meta["generatedAtLabel"]),
    ], styles))

    if meta["scope"] or meta["hazardDescription"]:
        story.append(Spacer(1, 6))
        story.append(Paragraph("2. Scope and Hazard Context", styles["section"]))
        if meta["scope"]:
            story.append(Paragraph(f"<b>Scope.</b> {_escape(meta['scope'])}", styles["body"]))
        if meta["hazardDescription"]:
            story.append(Spacer(1, 3))
            story.append(Paragraph(f"<b>Hazard description.</b> {_escape(meta['hazardDescription'])}", styles["body"]))

    story.append(Spacer(1, 8))
    story.append(Paragraph("3. Routing Transparency", styles["section"]))
    story.append(Paragraph(
        "The table below records the exact backend routing chosen for each subsystem. It is derived from the normalized engine payload and the wrapper logic currently exposed by the Python backend.",
        styles["body"],
    ))
    story.append(Spacer(1, 4))
    story.append(_routing_table(context["trace"]["subsystems"], styles))

    story.append(Spacer(1, 8))
    story.append(Paragraph("4. Result Summary", styles["section"]))
    story.append(_summary_matrix(context, styles))

    subsystem_order = ["sensors", "solver", "actuators"]
    titles = {
        "sensors": "5. Sensors Breakdown",
        "solver": "6. Logic Solver Breakdown",
        "actuators": "7. Final Elements Breakdown",
    }
    for key in subsystem_order:
        trace = context["trace"]["subsystems"][key]
        story.append(PageBreak())
        story.append(Paragraph(titles[key], styles["section"]))
        story.append(Paragraph(_escape(trace["routing"]["reason"]), styles["body"]))
        story.append(Spacer(1, 5))
        story.append(_subsystem_summary_table(trace, styles))
        story.append(Spacer(1, 4))
        story.append(_formula_block(trace["equations"], styles))
        if meta["showComponentTable"] and trace["channels"]:
            for channel in trace["channels"]:
                story.append(Spacer(1, 6))
                story.append(Paragraph(f"Channel {channel['id']}", styles["subsection"]))
                story.append(_formula_block(channel["aggregation"], styles))
                for component in channel["components"]:
                    story.append(Spacer(1, 3))
                    story.append(_component_card(component, styles))

    story.append(PageBreak())
    story.append(Paragraph("8. Global Combination Logic", styles["section"]))
    story.append(_formula_block(context["trace"]["global"]["equations"], styles))

    if meta["showComplianceMatrix"]:
        story.append(Spacer(1, 6))
        story.append(Paragraph("9. Compliance Matrix", styles["section"]))
        story.append(_compliance_table(context, styles))

    warnings = context["warnings"]
    if warnings:
        story.append(Spacer(1, 8))
        story.append(Paragraph("10. Warnings and Modeling Boundaries", styles["section"]))
        story.append(_warning_table(warnings, styles))

    if meta["showAssumptions"] and meta["assumptions"]:
        story.append(Spacer(1, 8))
        story.append(Paragraph("11. Editorial Assumptions Note", styles["section"]))
        story.append(Paragraph(_escape(meta["assumptions"]).replace("\n", "<br/>"), styles["body"]))

    if meta["showRecommendations"] and meta["recommendations"]:
        story.append(Spacer(1, 8))
        story.append(Paragraph("12. Engineering Recommendations", styles["section"]))
        story.append(Paragraph(_escape(meta["recommendations"]).replace("\n", "<br/>"), styles["body"]))

    story.append(PageBreak())
    story.append(Paragraph("Appendix A. Normalized Backend Payload", styles["section"]))
    story.append(Paragraph(
        "The snapshot below is the normalized engine input used by the backend wrapper. It is included to verify that the backend ran on the same parameters the frontend sent.",
        styles["body"],
    ))
    payload_json = _wrap_json(json.dumps(context["input"], indent=2, sort_keys=True))
    story.append(Spacer(1, 4))
    story.append(Preformatted(payload_json, styles["mono"]))
    return story


def _cover_page(context: dict[str, Any], styles: dict[str, ParagraphStyle]) -> list[Any]:
    meta = context["meta"]
    response = context["response"]
    achieved = meta["achievedSIL"]
    target = meta["targetSIL"]
    meets_target = target is None or (achieved is not None and achieved >= target)
    verdict_color = PRISM_SUCCESS if meets_target else PRISM_DANGER
    verdict = "Target met" if meets_target else "Target not met"

    cards = [
        ("Achieved SIL", _fmt_sil(achieved)),
        ("Target SIL", _fmt_sil(target)),
        ("PFDavg", _fmt(response["result"]["pfdavg"])),
        ("PFH", _fmt(response["result"]["pfh"])),
        ("RRF", _fmt(response["result"]["rrf"], scientific=False)),
    ]

    elements: list[Any] = [
        Spacer(1, 10 * mm),
        Paragraph(meta["title"], styles["title"]),
        Paragraph(
            "Backend calculation dossier with full routing transparency and normalized parameter trace.",
            styles["subtitle"],
        ),
        Spacer(1, 5),
        _badge_table([
            ("Project", meta["projectName"]),
            ("SIF", f"{meta['sifNumber']} {('— ' + meta['sifTitle']) if meta['sifTitle'] else ''}"),
            ("Document ref.", meta["docRef"]),
            ("Version", meta["version"]),
            ("Confidentiality", meta["confidentialityLabel"]),
            ("Generated at", meta["generatedAtLabel"]),
        ], styles),
        Spacer(1, 7),
        Table(
            [[Paragraph(f"<font color='{_color_hex(verdict_color)}'><b>{verdict}</b></font>", styles["body"])]],
            colWidths=[CONTENT_WIDTH],
            style=TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
                ("BOX", (0, 0), (-1, -1), 1, verdict_color),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]),
        ),
        Spacer(1, 7),
        _kpi_cards(cards, styles),
    ]

    if meta["preparedBy"] or meta["checkedBy"] or meta["approvedBy"]:
        elements.extend([
            Spacer(1, 8),
            Paragraph("Document control", styles["section"]),
            _two_column_key_table([
                ("Prepared by", meta["preparedBy"] or "—"),
                ("Checked by", meta["checkedBy"] or "—"),
                ("Approved by", meta["approvedBy"] or "—"),
            ], styles),
        ])

    elements.extend([
        Spacer(1, 14),
        Paragraph(
            f"Runtime {response['backend']['runtimeMs']:.2f} ms · Input digest {response['backend']['inputDigest']}",
            styles["muted"],
        ),
    ])
    return elements


def _draw_page_frame(canvas: Any, document: Any, context: dict[str, Any], first_page: bool) -> None:
    canvas.saveState()
    width, height = A4
    canvas.setFillColor(PRISM_NAVY if first_page else colors.white)
    if first_page:
        canvas.rect(0, height - 18 * mm, width, 18 * mm, stroke=0, fill=1)
        canvas.setFillColor(colors.white)
        canvas.setFont("Helvetica-Bold", 11)
        canvas.drawString(PAGE_MARGIN, height - 11 * mm, "PRISM Backend SIL Dossier")
    else:
        canvas.setStrokeColor(PRISM_LINE)
        canvas.line(PAGE_MARGIN, height - 10 * mm, width - PAGE_MARGIN, height - 10 * mm)
        canvas.setFillColor(PRISM_SLATE)
        canvas.setFont("Helvetica", 8)
        canvas.drawString(PAGE_MARGIN, height - 7 * mm, context["meta"]["docRef"])

    canvas.setStrokeColor(PRISM_LINE)
    canvas.line(PAGE_MARGIN, 10 * mm, width - PAGE_MARGIN, 10 * mm)
    canvas.setFillColor(PRISM_SLATE)
    canvas.setFont("Helvetica", 8)
    canvas.drawString(PAGE_MARGIN, 6 * mm, context["meta"]["confidentialityLabel"])
    canvas.drawRightString(width - PAGE_MARGIN, 6 * mm, f"Page {document.page}")
    canvas.restoreState()


def _badge_table(items: list[tuple[str, str]], styles: dict[str, ParagraphStyle]) -> Table:
    rows = []
    for left, right in items:
        rows.append([
            Paragraph(f"<b>{_escape(left)}</b>", styles["small"]),
            Paragraph(_escape(right or "—"), styles["small"]),
        ])
    table = Table(rows, colWidths=[35 * mm, CONTENT_WIDTH - 35 * mm], hAlign="LEFT")
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), PRISM_SURFACE),
        ("BOX", (0, 0), (-1, -1), 0.8, PRISM_LINE),
        ("INNERGRID", (0, 0), (-1, -1), 0.4, PRISM_LINE),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    return table


def _kpi_cards(items: list[tuple[str, str]], styles: dict[str, ParagraphStyle]) -> Table:
    row = []
    for label, value in items:
        row.append(Table(
            [
                [Paragraph(_escape(label), styles["kpiLabel"])],
                [Paragraph(_escape(value), styles["kpi"])],
            ],
            colWidths=[(CONTENT_WIDTH - 4 * mm) / 5.0],
            style=TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), PRISM_SURFACE),
                ("BOX", (0, 0), (-1, -1), 0.8, PRISM_LINE),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]),
        ))
    return Table([row], colWidths=[(CONTENT_WIDTH - 4 * mm) / 5.0] * 5)


def _two_column_key_table(items: list[tuple[str, str]], styles: dict[str, ParagraphStyle]) -> Table:
    rows = []
    for label, value in items:
        rows.append([
            Paragraph(f"<b>{_escape(label)}</b>", styles["small"]),
            Paragraph(_escape(value or "—"), styles["small"]),
        ])
    table = Table(rows, colWidths=[40 * mm, CONTENT_WIDTH - 40 * mm], hAlign="LEFT")
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.white),
        ("BOX", (0, 0), (-1, -1), 0.8, PRISM_LINE),
        ("INNERGRID", (0, 0), (-1, -1), 0.35, PRISM_LINE),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    return table


def _routing_table(subsystems: dict[str, dict[str, Any]], styles: dict[str, ParagraphStyle]) -> Table:
    rows = [[
        Paragraph("<b>Subsystem</b>", styles["small"]),
        Paragraph("<b>Architecture</b>", styles["small"]),
        Paragraph("<b>PFD engine</b>", styles["small"]),
        Paragraph("<b>PFH engine</b>", styles["small"]),
        Paragraph("<b>lambdaD×T1</b>", styles["small"]),
        Paragraph("<b>Threshold</b>", styles["small"]),
        Paragraph("<b>Markov</b>", styles["small"]),
    ]]
    for key in ["sensors", "solver", "actuators"]:
        item = subsystems[key]
        routing = item["routing"]
        rows.append([
            Paragraph(_escape(item["name"]), styles["small"]),
            Paragraph(_escape(routing["effectiveArchitecture"]), styles["small"]),
            Paragraph(_escape(str(routing["pfdEngine"] or "—")), styles["small"]),
            Paragraph(_escape(str(routing["pfhEngine"] or "—")), styles["small"]),
            Paragraph(_escape(_fmt(routing["lambdaT1"]) if routing["lambdaT1"] is not None else "—"), styles["small"]),
            Paragraph(_escape(_fmt(routing["thresholdUsed"]) if routing["thresholdUsed"] is not None else "—"), styles["small"]),
            Paragraph("Yes" if routing["markovTriggered"] else "No", styles["small"]),
        ])
    table = Table(rows, colWidths=[28 * mm, 24 * mm, 30 * mm, 31 * mm, 22 * mm, 22 * mm, 13 * mm])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), PRISM_SURFACE),
        ("BOX", (0, 0), (-1, -1), 0.8, PRISM_LINE),
        ("INNERGRID", (0, 0), (-1, -1), 0.35, PRISM_LINE),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    return table


def _summary_matrix(context: dict[str, Any], styles: dict[str, ParagraphStyle]) -> Table:
    response = context["response"]["result"]
    meta = context["meta"]
    rows = [[
        Paragraph("<b>Signal</b>", styles["small"]),
        Paragraph("<b>Value</b>", styles["small"]),
        Paragraph("<b>Interpretation</b>", styles["small"]),
    ]]
    rows.extend([
        [
            Paragraph("PFDavg", styles["small"]),
            Paragraph(_fmt(response["pfdavg"]), styles["small"]),
            Paragraph("Average probability of failure on demand for the full SIF.", styles["small"]),
        ],
        [
            Paragraph("PFH", styles["small"]),
            Paragraph(_fmt(response["pfh"]), styles["small"]),
            Paragraph("Dangerous failure frequency per hour for the full SIF.", styles["small"]),
        ],
        [
            Paragraph("SIL from probability", styles["small"]),
            Paragraph(_fmt_sil(response["silFromPFD"]), styles["small"]),
            Paragraph("Classification derived from PFDavg/PFH thresholds.", styles["small"]),
        ],
        [
            Paragraph("Architectural cap", styles["small"]),
            Paragraph(
                f"S={_fmt_sil(response['silArchitectural']['sensors'])} / L={_fmt_sil(response['silArchitectural']['solver'])} / A={_fmt_sil(response['silArchitectural']['actuators'])}",
                styles["small"],
            ),
            Paragraph("Architectural SIL limits applied independently to each subsystem.", styles["small"]),
        ],
        [
            Paragraph("Achieved SIL", styles["small"]),
            Paragraph(_fmt_sil(response["silAchieved"]), styles["small"]),
            Paragraph(
                f"Minimum of probabilistic SIL and subsystem architectural caps. Target = {_fmt_sil(meta['targetSIL'])}.",
                styles["small"],
            ),
        ],
    ])
    table = Table(rows, colWidths=[35 * mm, 35 * mm, CONTENT_WIDTH - 70 * mm])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), PRISM_SURFACE),
        ("BOX", (0, 0), (-1, -1), 0.8, PRISM_LINE),
        ("INNERGRID", (0, 0), (-1, -1), 0.35, PRISM_LINE),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    return table


def _subsystem_summary_table(trace: dict[str, Any], styles: dict[str, ParagraphStyle]) -> Table:
    summary = trace["summary"]
    routing = trace["routing"]
    rows = [
        [Paragraph("<b>Metric</b>", styles["small"]), Paragraph("<b>Value</b>", styles["small"])],
        [Paragraph("Architecture", styles["small"]), Paragraph(_escape(routing["effectiveArchitecture"]), styles["small"])],
        [Paragraph("PFD engine", styles["small"]), Paragraph(_escape(str(routing["pfdEngine"])), styles["small"])],
        [Paragraph("PFH engine", styles["small"]), Paragraph(_escape(str(routing["pfhEngine"])), styles["small"])],
        [Paragraph("PFDavg", styles["small"]), Paragraph(_fmt(summary["pfdavg"]), styles["small"])],
        [Paragraph("PFH", styles["small"]), Paragraph(_fmt(summary["pfh"]), styles["small"])],
        [Paragraph("SIL from probability", styles["small"]), Paragraph(_fmt_sil(summary["silFromPFD"]), styles["small"])],
        [Paragraph("Architectural SIL", styles["small"]), Paragraph(_fmt_sil(summary["silArchitectural"]), styles["small"])],
        [Paragraph("HFT", styles["small"]), Paragraph(str(summary["hft"]), styles["small"])],
        [Paragraph("SFF", styles["small"]), Paragraph(_fmt(summary["sff"], digits=4), styles["small"])],
    ]
    table = Table(rows, colWidths=[42 * mm, CONTENT_WIDTH - 42 * mm], hAlign="LEFT")
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), PRISM_SURFACE),
        ("BOX", (0, 0), (-1, -1), 0.8, PRISM_LINE),
        ("INNERGRID", (0, 0), (-1, -1), 0.35, PRISM_LINE),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    return table


def _component_card(component: dict[str, Any], styles: dict[str, ParagraphStyle]) -> Table:
    details = [
        [Paragraph(f"<b>{_escape(component['tag'])}</b> · {_escape(component['type'])}", styles["small"])],
        [Paragraph(
            f"Character {component['determinedCharacter']} · lambdaDU {_fmt(component['resolvedRates']['lambdaDU'])} · "
            f"lambdaDD {_fmt(component['resolvedRates']['lambdaDD'])} · T1 {_fmt_hours(component['test']['t1'])} · PTC {_fmt(component['test']['ptc'], digits=4)}",
            styles["small"],
        )],
        [Paragraph(_escape("<br/>".join(component["formulas"])).replace("&lt;br/&gt;", "<br/>"), styles["small"])],
    ]
    table = Table(details, colWidths=[CONTENT_WIDTH], hAlign="LEFT")
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.white),
        ("BOX", (0, 0), (-1, -1), 0.75, PRISM_LINE),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    return table


def _formula_block(lines: list[str], styles: dict[str, ParagraphStyle]) -> Table:
    rows = [[Paragraph(f"{index + 1}. {_escape(line)}", styles["small"])] for index, line in enumerate(lines)]
    table = Table(rows, colWidths=[CONTENT_WIDTH], hAlign="LEFT")
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), PRISM_SURFACE),
        ("BOX", (0, 0), (-1, -1), 0.75, PRISM_LINE),
        ("INNERGRID", (0, 0), (-1, -1), 0.25, PRISM_LINE),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    return table


def _compliance_table(context: dict[str, Any], styles: dict[str, ParagraphStyle]) -> Table:
    meta = context["meta"]
    response = context["response"]["result"]
    achieved = response["silAchieved"]
    target = meta["targetSIL"]
    pass_fail = "Pass" if target is None or (achieved is not None and achieved >= target) else "Fail"
    tone = PRISM_SUCCESS if pass_fail == "Pass" else PRISM_DANGER

    rows = [
        [Paragraph("<b>Check</b>", styles["small"]), Paragraph("<b>Status</b>", styles["small"]), Paragraph("<b>Evidence</b>", styles["small"])],
        [
            Paragraph("Probabilistic SIL classification", styles["small"]),
            Paragraph(_fmt_sil(response["silFromPFD"]), styles["small"]),
            Paragraph(f"PFDavg/PFH classification gave {_fmt_sil(response['silFromPFD'])}.", styles["small"]),
        ],
        [
            Paragraph("Architectural SIL cap", styles["small"]),
            Paragraph(_fmt_sil(response["silAchieved"]), styles["small"]),
            Paragraph("Architectural caps are applied per subsystem and then combined by minimum rule.", styles["small"]),
        ],
        [
            Paragraph("Target comparison", styles["small"]),
            Paragraph(f"<font color='{_color_hex(tone)}'><b>{pass_fail}</b></font>", styles["small"]),
            Paragraph(f"Target {_fmt_sil(target)} vs achieved {_fmt_sil(achieved)}.", styles["small"]),
        ],
    ]
    table = Table(rows, colWidths=[44 * mm, 24 * mm, CONTENT_WIDTH - 68 * mm], hAlign="LEFT")
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), PRISM_SURFACE),
        ("BOX", (0, 0), (-1, -1), 0.8, PRISM_LINE),
        ("INNERGRID", (0, 0), (-1, -1), 0.35, PRISM_LINE),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    return table


def _warning_table(warnings: list[dict[str, Any]], styles: dict[str, ParagraphStyle]) -> Table:
    rows = [[
        Paragraph("<b>Severity</b>", styles["small"]),
        Paragraph("<b>Code</b>", styles["small"]),
        Paragraph("<b>Affected</b>", styles["small"]),
        Paragraph("<b>Message</b>", styles["small"]),
    ]]
    for item in warnings:
        severity = item["severity"]
        color = PRISM_DANGER if severity == "ERROR" else PRISM_AMBER if severity == "WARNING" else PRISM_SLATE
        rows.append([
            Paragraph(f"<font color='{_color_hex(color)}'><b>{severity}</b></font>", styles["small"]),
            Paragraph(_escape(item["code"]), styles["small"]),
            Paragraph(_escape(item.get("affected") or "—"), styles["small"]),
            Paragraph(_escape(item["message"]), styles["small"]),
        ])
    table = Table(rows, colWidths=[18 * mm, 30 * mm, 28 * mm, CONTENT_WIDTH - 76 * mm], hAlign="LEFT")
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), PRISM_SURFACE),
        ("BOX", (0, 0), (-1, -1), 0.8, PRISM_LINE),
        ("INNERGRID", (0, 0), (-1, -1), 0.35, PRISM_LINE),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    return table


def _build_filename(meta: dict[str, Any]) -> str:
    stem = meta["docRef"] or meta["sifNumber"] or "prism_sil_backend_report"
    safe = re.sub(r"[^A-Za-z0-9._-]+", "_", stem).strip("._") or "prism_sil_backend_report"
    return f"{safe}.pdf"


def _fmt(value: float | int | None, digits: int = 3, scientific: bool = True) -> str:
    if value is None:
        return "—"
    if isinstance(value, bool):
        return "True" if value else "False"
    if not math.isfinite(float(value)):
        return "nan"
    magnitude = abs(float(value))
    if scientific and magnitude != 0 and (magnitude < 1e-2 or magnitude >= 1e4):
        return f"{float(value):.{digits}e}"
    return f"{float(value):,.{digits}f}".replace(",", " ")


def _fmt_terms(values: list[float | None]) -> str:
    return " + ".join(_fmt(value) for value in values)


def _fmt_sil(value: int | None) -> str:
    return f"SIL {value}" if value is not None else "—"


def _fmt_hours(hours: float | None) -> str:
    if hours is None:
        return "—"
    years = hours / 8760.0
    if years >= 0.1:
        return f"{hours:,.1f} h ({years:.2f} y)".replace(",", " ")
    return f"{hours:,.1f} h".replace(",", " ")


def _escape(value: str) -> str:
    return (
        value.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


def _wrap_json(value: str, width: int = 112) -> str:
    wrapped_lines = []
    for line in value.splitlines():
        if len(line) <= width:
            wrapped_lines.append(line)
            continue
        wrapped_lines.extend(textwrap.wrap(line, width=width, subsequent_indent="  "))
    return "\n".join(wrapped_lines)


def _color_hex(color: Any) -> str:
    return "#{:02x}{:02x}{:02x}".format(
        int(round(color.red * 255)),
        int(round(color.green * 255)),
        int(round(color.blue * 255)),
    )
