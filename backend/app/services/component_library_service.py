from __future__ import annotations

from functools import lru_cache
from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path
import sys
from types import ModuleType

from app.schemas import LambdaDbLibraryResponse, LibraryComponentSeed, LibraryFactorizedSeed, LibraryTestSeed


LAMBDA_DB_FILE = Path(__file__).resolve().parents[2] / "sil-py" / "sil_engine" / "lambda_db_v0.7.2.py"


@lru_cache(maxsize=1)
def _load_lambda_db_module() -> ModuleType:
    spec = spec_from_file_location("prism_lambda_db", LAMBDA_DB_FILE)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Unable to load lambda_db from {LAMBDA_DB_FILE}")

    module = module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def _infer_subsystem_type(category: str, description: str, key: str) -> str:
    text = f"{category} {description} {key}".lower()

    if "logic" in category.lower() or "plc" in text or "controller" in text or "relay" in text:
        return "logic"
    if any(token in text for token in ("valve", "actuator", "positioner", "esdv", "xv", "sdv", "psv", "pump")):
        return "actuator"
    return "sensor"


def _infer_instrument_category(subsystem_type: str, description: str, key: str) -> str:
    text = f"{description} {key}".lower()

    if subsystem_type == "logic":
        return "relay" if "relay" in text else "controller"
    if subsystem_type == "actuator":
        return "positioner" if "positioner" in text else "valve"
    if "switch" in text or "pushbutton" in text or "push_button" in text:
        return "switch"
    if "transmitter" in text:
        return "transmitter"
    return "other"


def _safe_lambda_total(entry) -> float:
    lambda_dd = entry.lambda_DD
    lambda_d = entry.lambda_D if entry.lambda_D is not None else entry.lambda_DU + lambda_dd

    if entry.lambda_S is not None:
        safe_total = entry.lambda_S
    elif entry.SFF is not None and 0 <= entry.SFF < 1:
        total = (entry.lambda_DU + lambda_dd) / max(1e-9, 1 - entry.SFF)
        safe_total = max(total - (entry.lambda_DU + lambda_dd), 0.0)
    elif entry.lambda_crit is not None:
        safe_total = max(entry.lambda_crit - lambda_d, 0.0)
    else:
        safe_total = 0.0

    return max(lambda_d + safe_total, entry.lambda_DU + lambda_dd)


def _build_tags(entry, subsystem_type: str, instrument_category: str) -> list[str]:
    tags = [subsystem_type, instrument_category, entry.category, *entry.key.split("_")]
    deduped: list[str] = []
    for tag in tags:
        normalized = str(tag).strip().lower()
        if normalized and normalized not in deduped:
            deduped.append(normalized)
    return deduped[:8]


def _entry_to_seed(entry) -> LibraryComponentSeed:
    subsystem_type = _infer_subsystem_type(entry.category, entry.description, entry.key)
    instrument_category = _infer_instrument_category(subsystem_type, entry.description, entry.key)
    lambda_dd = entry.lambda_DD
    lambda_total = _safe_lambda_total(entry)
    lambda_d = entry.lambda_D if entry.lambda_D is not None else entry.lambda_DU + lambda_dd
    lambda_safe = max(lambda_total - lambda_d, 0.0)
    factorized = LibraryFactorizedSeed(
        **{
            "lambda": lambda_total * 1e6,
            "lambdaDRatio": lambda_d / lambda_total if lambda_total > 0 else 1.0,
            "DCd": entry.DC,
            "DCs": 1.0,
        }
    )
    description = entry.description.strip()
    source_reference = f"{entry.source} §{entry.section}" if entry.section else entry.source

    return LibraryComponentSeed(
        id=f"lambda-db-{entry.key}",
        name=description,
        description=description,
        subsystemType=subsystem_type,
        instrumentCategory=instrument_category,
        instrumentType=description,
        manufacturer="",
        dataSource=entry.source,
        sourceReference=source_reference,
        tags=_build_tags(entry, subsystem_type, instrument_category),
        factorized=factorized,
        test=LibraryTestSeed(T1=1, T1Unit="yr"),
        componentPatch={
            "paramMode": "developed",
            "description": description,
            "dataSource": entry.source,
            "determinedCharacter": "TYPE_A" if subsystem_type == "actuator" else "TYPE_B",
            "developed": {
                "lambda_DU": entry.lambda_DU * 1e9,
                "lambda_DD": lambda_dd * 1e9,
                "lambda_SU": 0,
                "lambda_SD": lambda_safe * 1e9,
            },
        },
    )


def list_lambda_db_component_library() -> LambdaDbLibraryResponse:
    module = _load_lambda_db_module()
    entries = module.list_equipment()
    templates = sorted(
        (_entry_to_seed(entry) for entry in entries),
        key=lambda seed: (seed.subsystemType, seed.instrumentType.lower(), seed.name.lower()),
    )

    return LambdaDbLibraryResponse(
        version=LAMBDA_DB_FILE.stem.replace("lambda_db_", ""),
        count=len(templates),
        templates=templates,
    )
