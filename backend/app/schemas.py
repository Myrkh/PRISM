from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class WarningEntry(BaseModel):
    code: str
    severity: Literal["INFO", "WARNING", "ERROR"]
    message: str
    affected: str | None = None


class FailureRateFactorised(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    mode: Literal["FACTORISED"]
    lambda_value: float = Field(alias="lambda")
    lambdaD_ratio: float
    DCd: float
    DCs: float


class FailureRateDeveloped(BaseModel):
    model_config = ConfigDict(extra="forbid")

    mode: Literal["DEVELOPED"]
    lambdaDU: float
    lambdaDD: float
    lambdaSU: float
    lambdaSD: float


class TestParams(BaseModel):
    model_config = ConfigDict(extra="forbid")

    type: Literal["STOPPED", "WORKING", "NONE"]
    T1: float
    T0: float
    sigma: float
    gamma: float
    pi: float
    X: bool
    lambdaStar: float | None = None
    omega1: float
    omega2: float
    ptc: float
    lifetime: float | None = None


class PartialStrokeParams(BaseModel):
    model_config = ConfigDict(extra="forbid")

    enabled: bool
    X: bool
    pi: float
    efficiency: float
    nbTests: int


class ComponentParams(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    tag: str
    parentComponentId: str | None = None
    description: str | None = None
    type: Literal["SENSOR", "SOLVER", "ACTUATOR"]
    category: str | None = None
    instrumentType: str | None = None
    manufacturer: str | None = None
    dataSource: str | None = None
    determinedCharacter: Literal["NON_TYPE_AB", "TYPE_B", "TYPE_A"]
    failureRate: FailureRateFactorised | FailureRateDeveloped
    MTTR: float
    test: TestParams
    partialStroke: PartialStrokeParams | None = None
    hft: int | None = None


class ChannelDef(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    components: list[ComponentParams]
    existingRef: str | None = None


class CCFDef(BaseModel):
    model_config = ConfigDict(extra="forbid")

    beta: float
    betaD: float
    method: Literal["MIN", "MAX", "AVERAGE", "GEOMETRIC", "QUADRATIC"]


class SubsystemDef(BaseModel):
    model_config = ConfigDict(extra="forbid")

    channels: list[ChannelDef]
    voting: dict[str, int]
    voteType: Literal["S", "A", "M"]
    ccf: CCFDef
    standard: Literal["IEC61508_ROUTE1H", "IEC61508_ROUTE2H", "IEC61511_2016"] | None = None
    architecture: str | None = None
    customExpression: str | None = None
    manualHFT: int | None = None


class SolverDef(BaseModel):
    model_config = ConfigDict(extra="forbid")

    mode: Literal["SIMPLE", "ADVANCED"]
    pfd: float | None = None
    pfh: float | None = None
    component: ComponentParams | None = None
    channels: list[ChannelDef] | None = None
    voting: dict[str, int] | None = None
    voteType: Literal["S", "A", "M"] | None = None
    ccf: CCFDef | None = None
    standard: Literal["IEC61508_ROUTE1H", "IEC61508_ROUTE2H", "IEC61511_2016"] | None = None
    architecture: str | None = None
    customExpression: str | None = None
    manualHFT: int | None = None


class SIFDefinition(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    demandMode: Literal["LOW_DEMAND", "HIGH_DEMAND", "CONTINUOUS"]
    missionTime: float
    sensors: SubsystemDef
    solver: SolverDef
    actuators: SubsystemDef


class EngineOptions(BaseModel):
    model_config = ConfigDict(extra="forbid")

    standard: Literal["IEC61508_ROUTE1H", "IEC61508_ROUTE2H", "IEC61511_2016"]
    mrt: float
    computeSTR: bool
    computeCurve: bool
    curvePoints: int


class EngineInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    sif: SIFDefinition
    options: EngineOptions


class SILRuntimeOptions(BaseModel):
    model_config = ConfigDict(extra="forbid")

    calculationMode: Literal["AUTO", "ANALYTICAL", "MARKOV"] = "AUTO"
    includeComponentResults: bool = True
    includeChannelResults: bool = True
    includeCurve: bool | None = None


class SILComputeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    input: EngineInput
    runtime: SILRuntimeOptions = Field(default_factory=SILRuntimeOptions)


class SILReportMeta(BaseModel):
    model_config = ConfigDict(extra="forbid")

    projectName: str | None = None
    projectRef: str | None = None
    sifNumber: str | None = None
    sifTitle: str | None = None
    targetSIL: int | None = None
    title: str | None = None
    docRef: str | None = None
    version: str | None = None
    scope: str | None = None
    hazardDescription: str | None = None
    assumptions: str | None = None
    recommendations: str | None = None
    preparedBy: str | None = None
    checkedBy: str | None = None
    approvedBy: str | None = None
    confidentialityLabel: str | None = None
    showPFDChart: bool = True
    showSubsystemTable: bool = True
    showComponentTable: bool = True
    showComplianceMatrix: bool = True
    showAssumptions: bool = True
    showRecommendations: bool = True


class SILReportRequest(SILComputeRequest):
    report: SILReportMeta = Field(default_factory=SILReportMeta)


class LibraryFactorizedSeed(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    lambda_value: float = Field(alias="lambda")
    lambdaDRatio: float
    DCd: float
    DCs: float


class LibraryTestSeed(BaseModel):
    model_config = ConfigDict(extra="forbid")

    T1: float
    T1Unit: Literal["hr", "yr"]


class LibraryComponentSeed(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    name: str
    description: str
    subsystemType: Literal["sensor", "logic", "actuator"]
    instrumentCategory: str
    instrumentType: str
    manufacturer: str = ""
    dataSource: str
    sourceReference: str | None = None
    tags: list[str] = Field(default_factory=list)
    factorized: LibraryFactorizedSeed
    test: LibraryTestSeed
    componentPatch: dict[str, Any] | None = None


class LambdaDbLibraryResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    version: str
    count: int
    templates: list[LibraryComponentSeed]


class ComponentResult(BaseModel):
    componentId: str
    parentComponentId: str | None = None
    pfdavg: float | None = None
    pfh: float | None = None
    lambdaDU: float
    lambdaDD: float
    lambdaSU: float
    lambdaSD: float
    sff: float
    tce: float


class ChannelResult(BaseModel):
    channelId: str
    pfdavg: float | None = None
    pfh: float | None = None
    componentResults: list[ComponentResult]


class SubsystemResult(BaseModel):
    pfdavg: float | None = None
    pfh: float | None = None
    contributionPct: float
    silFromPFD: int | None = None
    silArchitectural: int | None = None
    hft: int
    sff: float
    pfd_ccf: float | None = None
    pfd_independent: float | None = None
    channelResults: list[ChannelResult]


class SILArchitecturalResult(BaseModel):
    sensors: int | None = None
    solver: int | None = None
    actuators: int | None = None


class PFDCurvePoint(BaseModel):
    t: float
    pfd: float
    pfdavg: float


class SILBackendSubsystemMeta(BaseModel):
    architecture: str
    effectiveArchitecture: str
    requestedMode: Literal["AUTO", "ANALYTICAL", "MARKOV"]
    pfdEngine: str | None = None
    pfhEngine: str | None = None
    lambdaT1: float | None = None
    thresholdUsed: float | None = None
    markovTriggered: bool | None = None
    heterogeneousChannels: bool = False


class SILBackendMeta(BaseModel):
    service: str
    serviceVersion: str
    runtimeMs: float
    inputDigest: str
    requestedMode: Literal["AUTO", "ANALYTICAL", "MARKOV"]
    subsystems: dict[str, SILBackendSubsystemMeta]


class SILComputeResult(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    sifId: str
    pfdavg: float
    pfh: float
    strValue: float | None = Field(default=None, alias="str")
    mttps: float | None = None
    rrf: float | None = None
    silFromPFD: int | None = None
    silArchitectural: SILArchitecturalResult
    silAchieved: int | None = None
    contributions: dict[str, SubsystemResult]
    curve: list[PFDCurvePoint] | None = None
    warnings: list[WarningEntry]


class SILComputeResponse(BaseModel):
    result: SILComputeResult
    backend: SILBackendMeta
