/**
 * core/types/index.ts — PRISM Type Barrel
 *
 * Re-exports all domain types from their dedicated files.
 * All existing imports `from '@/core/types'` continue to work.
 *
 * Domain files:
 *   sil.types.ts        — SIL levels, Architecture definitions
 *   component.types.ts  — Component params, Subsystems, Channels
 *   sif.types.ts        — SIF, Project, Revision
 *   prooftest.types.ts  — Proof test, Campaigns, Events
 *   hazop.types.ts      — HAZOP / LOPA traceability
 *   calc.types.ts       — Calculation results, Chart data
 */

// ─── Foundation ───────────────────────────────────────────────────────────
export type { SILLevel, SILMeta, Architecture, ArchitectureMeta } from './sil.types'
export { SIL_META, ARCHITECTURE_META } from './sil.types'

// ─── Components & Architecture ────────────────────────────────────────────
export type {
  SubsystemType, ParamMode, TestType, NatureType, InstrumentCategory,
  DeterminedCharacter, VoteType, CCFMethod, BetaAssessmentMode, BetaAssessmentProfile, BetaDiagnosticIntervalUnit, BetaAssessmentConfig, SubsystemCCF,
  FactorizedParams, DevelopedParams, TestParams, PartialTestParams, AdvancedParams,
  SIFComponent, SubElement,
  BooleanGate, CustomBooleanArch, LibraryComponent,
  SIFChannel, SIFSubsystem,
} from './component.types'

// ─── SIF & Project ────────────────────────────────────────────────────────
export type {
  SIFStatus,
  SIFAssumptionStatus,
  SIFAssumptionCategory,
  SIFReferenceTab,
  RevisionArtifactStatus,
  SIFRevisionArtifact,
  SIFAssumption,
  SIF,
  ProjectStatus,
  Project,
  SIFRevision,
} from './sif.types'

// ─── Proof Test & Campaigns ──────────────────────────────────────────────
export type {
  ProofTestLocation, ProofTestResultType, ProofTestStep,
  ProofTestCategoryType, ProofTestCategory,
  ProofTestResponseCheckType, ProofTestResponseCheck,
  ProofTestProcedureStatus, ProofTestProcedure,
  ProofTestResponseMeasurement,
  ProofTestArtifactStatus, ProofTestCampaignArtifact,
  CampaignVerdict, StepResult, TestCampaign,
  OperationalEventType, OperationalEvent,
} from './prooftest.types'
export { PROOF_TEST_LOCATIONS, CATEGORY_TYPE_META } from './prooftest.types'

// ─── HAZOP / LOPA ─────────────────────────────────────────────────────────
export type { HAZOPTrace } from './hazop.types'

// ─── Calculation Results ──────────────────────────────────────────────────
export type {
  ComponentCalcResult, SubsystemCalcResult, SIFCalcResult, PFDChartPoint,
} from './calc.types'

// ─── Auth & Profiles ──────────────────────────────────────────────────────
export type { OAuthProviderName, PasswordSignUpResult, UserProfile } from './auth.types'

// ─── Component Library ────────────────────────────────────────────────────
export type {
  ComponentTemplateScope,
  ComponentTemplateReviewStatus,
  ComponentTemplateOrigin,
  ComponentTemplate,
  ComponentTemplateUpsertInput,
  ComponentTemplateExportEnvelope,
} from './library.types'

// ─── Project Access ───────────────────────────────────────────────────────
export type {
  ProjectPermissionKey,
  ProjectMemberStatus,
  ProjectRole,
  ProjectMemberProfile,
  ProjectTeamMember,
  ProjectAccessSnapshot,
} from './access.types'
export { PROJECT_PERMISSION_DEFINITIONS } from './access.types'
