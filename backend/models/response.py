"""
Modèles Pydantic pour les réponses FastAPI.
"""

from pydantic import BaseModel
from typing import Optional, Any
from enum import Enum


class JobStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    DONE = "done"
    FAILED = "failed"


class SubsystemContribution(BaseModel):
    name: str
    architecture: str
    pfdavg: float
    pct_contribution: float
    lambda_T1: float
    method_used: str


class PSTResult(BaseModel):
    enabled: bool
    pfdavg_with_pst: Optional[float] = None
    pfdavg_without_pst: Optional[float] = None
    improvement_factor: Optional[float] = None
    iec_error_pct: Optional[float] = None
    warnings: list[str] = []


class PDSResult(BaseModel):
    enabled: bool
    pfd: Optional[float] = None
    ptif: Optional[float] = None
    csu: Optional[float] = None
    sil_from_pfd: Optional[int] = None
    sil_from_csu: Optional[int] = None
    warnings: list[str] = []


class MarkovComputeResponse(BaseModel):
    """Réponse principale du calcul Markov."""
    pfdavg: float
    rrf: float
    sil_from_pfd: int
    sil_achieved: int
    contributions: list[SubsystemContribution]
    pst: PSTResult
    pds: PDSResult
    method_used: str
    lambda_T1: float
    warnings: list[str]
    computation_time_ms: float


class MonteCarloStats(BaseModel):
    n_simulations: int
    mean: float
    median: float
    std: float
    p5: float
    p10: float
    p50: float
    p90: float
    p95: float
    ci_90_lower: float
    ci_90_upper: float
    rrf_mean: float
    sil_p50: int
    sil_p95: int


class AsyncJobResponse(BaseModel):
    job_id: str
    status: JobStatus
    progress_pct: Optional[int] = None
    result: Optional[Any] = None
    error: Optional[str] = None
