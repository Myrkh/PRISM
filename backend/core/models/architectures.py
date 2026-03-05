"""Architecture definitions and SIL metadata — IEC 61508 / IEC 61511"""
from __future__ import annotations
from typing import Literal
from pydantic import BaseModel

SILLevel = Literal[0, 1, 2, 3, 4]


class SILMeta(BaseModel):
    sil: SILLevel
    label: str
    color: str
    pfd_min: float
    pfd_max: float
    rrf_min: float
    rrf_max: float


SIL_META: dict[int, SILMeta] = {
    0: SILMeta(sil=0, label="N/A",   color="#6b7280", pfd_min=1e-2,  pfd_max=1.0,   rrf_min=1,     rrf_max=100),
    1: SILMeta(sil=1, label="SIL 1", color="#4ade80", pfd_min=1e-2,  pfd_max=1e-1,  rrf_min=10,    rrf_max=100),
    2: SILMeta(sil=2, label="SIL 2", color="#60a5fa", pfd_min=1e-3,  pfd_max=1e-2,  rrf_min=100,   rrf_max=1000),
    3: SILMeta(sil=3, label="SIL 3", color="#fbbf24", pfd_min=1e-4,  pfd_max=1e-3,  rrf_min=1000,  rrf_max=10000),
    4: SILMeta(sil=4, label="SIL 4", color="#c084fc", pfd_min=1e-5,  pfd_max=1e-4,  rrf_min=10000, rrf_max=100000),
}

ARCH_INFO = {
    "1oo1":  {"channels": 1, "HFT": 0, "description": "Single channel"},
    "1oo2":  {"channels": 2, "HFT": 1, "description": "Dual channel — one-out-of-two"},
    "2oo2":  {"channels": 2, "HFT": 0, "description": "Dual channel — two-out-of-two"},
    "2oo3":  {"channels": 3, "HFT": 1, "description": "Triple channel — two-out-of-three"},
    "1oo2D": {"channels": 2, "HFT": 1, "description": "1oo2 with diagnostics"},
}
