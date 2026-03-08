"""
Modèles Pydantic pour les requêtes FastAPI.
"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional, Literal
from enum import Enum


class Architecture(str, Enum):
    OO1 = "1oo1"
    OO2 = "1oo2"
    OO2D = "1oo2D"
    OO3 = "2oo3"
    OO3_1 = "1oo3"
    OO2_2 = "2oo2"
    MOON = "MooN"


class DemandMode(str, Enum):
    LOW = "low_demand"
    HIGH = "high_demand"


class SubsystemRequest(BaseModel):
    name: str = Field(default="Subsystem", description="Nom du sous-système")
    lambda_du: float = Field(..., gt=0, description="Taux défaillance DU [1/h]")
    lambda_dd: float = Field(default=0.0, ge=0, description="Taux défaillance DD [1/h]")
    lambda_s: float = Field(default=0.0, ge=0, description="Taux défaillance sécurité [1/h]")
    DC: float = Field(default=0.0, ge=0, le=1, description="Couverture diagnostique (0-1)")
    beta: float = Field(default=0.02, ge=0, le=0.3, description="Facteur CCF β")
    beta_D: Optional[float] = Field(default=None, ge=0, le=0.3,
                                     description="Facteur CCF β_D (défaut = β/2)")
    architecture: Architecture = Architecture.OO1
    M: Optional[int] = Field(default=None, ge=1, description="M dans MooN")
    N: Optional[int] = Field(default=None, ge=1, description="N dans MooN")
    MTTR: float = Field(default=8.0, gt=0, description="MTTR [h]")
    T1: float = Field(default=8760.0, gt=0, description="Intervalle essai [h]")
    PTC: float = Field(default=1.0, ge=0, le=1, description="Couverture proof test")
    T2: float = Field(default=87600.0, gt=0, description="Intervalle essai complet [h]")
    # STR parameters (MD 21_STR_SPURIOUS_TRIP — NTNU Ch.12)
    lambda_so: float = Field(default=0.0, ge=0, description="Taux spurious operation [1/h]")
    beta_so: float = Field(default=0.02, ge=0, le=0.3, description="Facteur CCF SO")
    mttr_so: float = Field(default=8.0, gt=0, description="MTTR SO [h]")
    lambda_fd: float = Field(default=0.0, ge=0, description="Taux fausses demandes [1/h]")

    @field_validator("beta_D", mode="before")
    @classmethod
    def set_beta_d(cls, v, info):
        if v is None and "beta" in info.data:
            return info.data["beta"] / 2.0
        return v

    def to_params(self):
        from solver.formulas import SubsystemParams
        arch = self.architecture.value
        m = self.M or 1
        n = self.N or {"1oo1": 1, "2oo2": 2, "1oo2": 2, "1oo2D": 2,
                       "2oo3": 3, "1oo3": 3, "MooN": max(m, 1)}.get(arch, 1)
        return SubsystemParams(
            lambda_DU=self.lambda_du,
            lambda_DD=self.lambda_dd,
            lambda_S=self.lambda_s,
            DC=self.DC,
            beta=self.beta,
            beta_D=self.beta_D or (self.beta / 2.0),
            MTTR=self.MTTR,
            T1=self.T1,
            PTC=self.PTC,
            T2=self.T2,
            architecture=arch,
            M=m,
            N=n,
            lambda_SO=self.lambda_so,
            beta_SO=self.beta_so,
            MTTR_SO=self.mttr_so,
            lambda_FD=self.lambda_fd,
        )


class PSTConfig(BaseModel):
    enabled: bool = False
    T_PST: float = Field(default=720.0, gt=0, description="Intervalle PST [h]")
    c_PST: float = Field(default=0.70, ge=0, le=1, description="Couverture PST")
    d_PST: float = Field(default=2.0, gt=0, description="Durée PST [h]")


class PDSConfig(BaseModel):
    enabled: bool = False
    ptif_fraction: float = Field(default=0.05, ge=0, le=0.5)
    cPT: float = Field(default=1.0, ge=0, le=1)
    additional_ptif: float = Field(default=0.0, ge=0)
    use_csu_for_sil: bool = True


class MarkovComputeRequest(BaseModel):
    """Requête principale pour calcul Markov."""
    subsystems: list[SubsystemRequest] = Field(..., min_length=1)
    demand_mode: DemandMode = DemandMode.LOW
    force_markov: bool = Field(default=False, description="Forcer Markov même si IEC suffisant")
    threshold_lambda_T1: float = Field(default=0.1, gt=0,
                                        description="Seuil λ×T1 au-delà duquel Markov est utilisé")
    pst: PSTConfig = Field(default_factory=PSTConfig)
    pds: PDSConfig = Field(default_factory=PDSConfig)


class MonteCarloRequest(BaseModel):
    """Requête Monte Carlo avec incertitudes."""
    base_request: MarkovComputeRequest
    n_simulations: int = Field(default=10000, ge=100, le=500000)
    seed: int = Field(default=42)
    uncertainty_cov: float = Field(
        default=0.3, ge=0, le=2.0,
        description="Coefficient de variation pour les incertitudes (0 = pas d'incertitude)"
    )
    uncertainty: bool = Field(default=True)
