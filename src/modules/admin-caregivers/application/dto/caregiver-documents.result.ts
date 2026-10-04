/** The compliance summary strip at the top of the Documents tab. */
export interface CaregiverComplianceSummaryResult {
  overallStatus: string;
  message: string;
  requirementsMet: number;
  requirementsTotal: number;
  /** The furthest out credential expiry: how long the credentialing is valid for. */
  credentialingValidUntil: string | null;
  nextImpendingExpiry: { name: string; expiresAt: string; daysRemaining: number } | null;
  documentsOnFile: number;
  lastUpdated: string | null;
}

/** One entry of the Upcoming Renewals panel. */
export interface CaregiverRenewalResult {
  id: string;
  name: string;
  expiresAt: string;
  monthsAway: number;
  /** REQUIRED soon, UPCOMING within the year, or VALID further out. */
  urgency: 'REQUIRED' | 'UPCOMING' | 'VALID';
  label: string;
}

/** One row of the Certifications and Licenses table. */
export interface CaregiverCredentialResult {
  id: string;
  name: string;
  kind: string;
  licenseNumber: string | null;
  issued: string | null;
  expires: string;
  status: string;
  fileName: string | null;
  hasDocument: boolean;
}

/** One row of the Employment Documents table. */
export interface CaregiverEmploymentDocumentResult {
  id: string;
  name: string;
  category: string;
  status: string;
  date: string | null;
  fileName: string | null;
  hasDocument: boolean;
}

/** One row of the Training Records table. */
export interface CaregiverTrainingRecordResult {
  id: string;
  name: string;
  status: string;
  completed: string | null;
  certificate: boolean;
  hoursLabel: string;
  hasCertificate: boolean;
}

/** One entry of the Document Upload History timeline. */
export interface CaregiverDocumentUploadResult {
  date: string;
  title: string;
  fileName: string | null;
  uploadedBy: string | null;
}

/** The composed caregiver Documents tab. */
export interface CaregiverDocumentsTabResult {
  summary: CaregiverComplianceSummaryResult;
  certifications: CaregiverCredentialResult[];
  employmentDocuments: CaregiverEmploymentDocumentResult[];
  trainingRecords: CaregiverTrainingRecordResult[];
  upcomingRenewals: CaregiverRenewalResult[];
  uploadHistory: CaregiverDocumentUploadResult[];
}
