// front/src/components/report/reportTypes.ts
export interface ReportConfig {
  title: string;
  docRef: string;
  version: string;
  scope: string;
  hazardDescription: string;
  assumptions: string;
  recommendations: string;
  preparedBy: string;
  checkedBy: string;
  approvedBy: string;
  showPFDChart: boolean;
  showSubsystemTable: boolean;
  showComponentTable: boolean;
  showComplianceMatrix: boolean;
  showAssumptions: boolean;
  showRecommendations: boolean;
  confidentialityLabel: string;
}
