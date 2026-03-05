"""
PFD Calculation Engine — IEC 61508-6:2010 Annex B / IEC 61511-1:2016 §11
Mirrored from frontend/src/core/math/pfdCalc.ts
"""
from __future__ import annotations
from typing import Literal
from pydantic import BaseModel, Field

FIT = 1e-9
Architecture = Literal["1oo1", "1oo2", "2oo2", "2oo3", "1oo2D"]


class SubsystemParams(BaseModel):
    lambda_DU: float = Field(..., ge=0, description="Dangerous Undetected [FIT]")
    lambda_DD: float = Field(..., ge=0, description="Dangerous Detected [FIT]")
    lambda_SU: float = Field(0.0, ge=0, description="Safe Undetected [FIT]")
    lambda_SD: float = Field(0.0, ge=0, description="Safe Detected [FIT]")
    TI: float = Field(..., gt=0, description="Proof Test Interval [hr]")
    MTTR: float = Field(..., gt=0, description="Mean Time To Restore [hr]")
    beta: float = Field(..., ge=0, le=1, description="CCF factor [0-1]")
    architecture: Architecture


class PFDResult(BaseModel):
    PFD_avg: float
    SFF: float
    DC: float
    HFT: int
    RRF: float
    SIL: Literal[0, 1, 2, 3, 4]


def _to_hr(fit: float) -> float:
    return fit * FIT


def classify_sil(pfd: float) -> Literal[0, 1, 2, 3, 4]:
    if pfd < 1e-5: return 4
    if pfd < 1e-4: return 3
    if pfd < 1e-3: return 2
    if pfd < 1e-2: return 1
    return 0


def calc_sff(p: SubsystemParams) -> float:
    lDU = _to_hr(p.lambda_DU)
    lDD = _to_hr(p.lambda_DD)
    lSU = _to_hr(p.lambda_SU)
    lSD = _to_hr(p.lambda_SD)
    tot = lDU + lDD + lSU + lSD
    return (lDD + lSU + lSD) / tot if tot > 0 else 0.0


def calc_dc(p: SubsystemParams) -> float:
    lDU = _to_hr(p.lambda_DU)
    lDD = _to_hr(p.lambda_DD)
    tot = lDU + lDD
    return lDD / tot if tot > 0 else 0.0


HFT_MAP: dict[str, int] = {
    "1oo1": 0, "2oo2": 0, "1oo2": 1, "1oo2D": 1, "2oo3": 1,
}


def get_hft(arch: str) -> int:
    return HFT_MAP[arch]


def _pfd_1oo1(p: SubsystemParams) -> float:
    """IEC 61508-6 Eq. B.10a"""
    return _to_hr(p.lambda_DU) * p.TI / 2 + _to_hr(p.lambda_DD) * p.MTTR


def _pfd_1oo2(p: SubsystemParams) -> float:
    """IEC 61508-6 Eq. B.11"""
    lDU = _to_hr(p.lambda_DU)
    lDD = _to_hr(p.lambda_DD)
    b = p.beta
    return (1 - b) ** 2 * lDU ** 2 * p.TI ** 2 / 3 + b * lDU * p.TI / 2 + 2 * lDD * p.MTTR


def _pfd_2oo2(p: SubsystemParams) -> float:
    return _to_hr(p.lambda_DU) * p.TI + 2 * _to_hr(p.lambda_DD) * p.MTTR


def _pfd_2oo3(p: SubsystemParams) -> float:
    """ISA TR84.00.02"""
    lDU = _to_hr(p.lambda_DU)
    b = p.beta
    return 3 * (1 - b) ** 2 * lDU ** 2 * p.TI ** 2 / 4 + b * lDU * p.TI / 2


def _pfd_1oo2d(p: SubsystemParams) -> float:
    lDU = _to_hr(p.lambda_DU)
    lDD = _to_hr(p.lambda_DD)
    b = p.beta
    return (1 - b) ** 2 * lDU ** 2 * p.TI ** 2 / 3 + b * lDU * p.TI / 2 + lDD * p.MTTR


_PFD_FNS = {
    "1oo1": _pfd_1oo1,
    "1oo2": _pfd_1oo2,
    "2oo2": _pfd_2oo2,
    "2oo3": _pfd_2oo3,
    "1oo2D": _pfd_1oo2d,
}


def calc_pfd(p: SubsystemParams) -> PFDResult:
    pfd_avg = _PFD_FNS[p.architecture](p)
    return PFDResult(
        PFD_avg=pfd_avg,
        SFF=calc_sff(p),
        DC=calc_dc(p),
        HFT=get_hft(p.architecture),
        RRF=1 / pfd_avg if pfd_avg > 0 else float("inf"),
        SIL=classify_sil(pfd_avg),
    )


def pfd_at_time(arch: str, t: float, p: SubsystemParams) -> float:
    lDU = _to_hr(p.lambda_DU)
    lDD = _to_hr(p.lambda_DD)
    b = p.beta
    fns = {
        "1oo1":  lambda: lDU * t + lDD * p.MTTR,
        "1oo2":  lambda: (1 - b) ** 2 * lDU ** 2 * t ** 2 / 3 + b * lDU * t / 2 + 2 * lDD * p.MTTR,
        "2oo2":  lambda: lDU * t + 2 * lDD * p.MTTR,
        "2oo3":  lambda: 3 * (1 - b) ** 2 * lDU ** 2 * t ** 2 / 4 + b * lDU * t / 2,
        "1oo2D": lambda: (1 - b) ** 2 * lDU ** 2 * t ** 2 / 3 + b * lDU * t / 2 + lDD * p.MTTR,
    }
    return fns[arch]() if arch in fns else 0.0
