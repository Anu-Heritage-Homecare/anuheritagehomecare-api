/** An uploaded document on an application. */
export interface ApplicationDocumentResult {
  label: string;
  key: string;
}

/** The full detail panel for one onboarding application. */
export interface ApplicationDetailResult {
  id: string;
  reference: string;
  familyName: string;
  patientName: string;
  selectedPlanType: string | null;
  planName: string | null;
  monthlyPriceMinor: number | null;
  currency: string;
  priority: string;
  paymentStatus: string;
  docsStatus: string;
  status: string;
  coordinatorName: string | null;
  submittedAt: string;
  patientAge: number | null;
  patientGender: string | null;
  patientConditions: string[];
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  contactAddress: string | null;
  requestedHoursPerWeek: number | null;
  requestedSchedule: string | null;
  specialNeeds: string | null;
  documents: ApplicationDocumentResult[];
}
