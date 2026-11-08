/** The kinds of report the Reports screen can produce (the Generate Report menu). */
export enum ReportType {
  Operations = 'OPERATIONS',
  CaregiverPerformance = 'CAREGIVER_PERFORMANCE',
  FinancialSummary = 'FINANCIAL_SUMMARY',
  ClientSatisfaction = 'CLIENT_SATISFACTION',
  WorkforceCompliance = 'WORKFORCE_COMPLIANCE',
}

/** The file format a report is produced in (the Export PDF / Export Excel actions). */
export enum ReportFormat {
  Pdf = 'PDF',
  Excel = 'EXCEL',
}

/** The human title shown in the Recent Report Activity feed for each report kind. */
export const REPORT_TYPE_TITLE: Record<ReportType, string> = {
  [ReportType.Operations]: 'Operations Report',
  [ReportType.CaregiverPerformance]: 'Caregiver Performance Report',
  [ReportType.FinancialSummary]: 'Financial Summary',
  [ReportType.ClientSatisfaction]: 'Client Satisfaction Survey',
  [ReportType.WorkforceCompliance]: 'Workforce Compliance Audit',
};
