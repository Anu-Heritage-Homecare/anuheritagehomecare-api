/**
 * The kind of reportable care event an incident records. Shown as the incident's
 * description on the Alerts and Incidents screen. Declared in the domain layer so
 * it is independent of the Prisma generated enum.
 */
export enum IncidentCategory {
  MedicationConcern = 'MEDICATION_CONCERN',
  RecipientFall = 'RECIPIENT_FALL',
  ServiceComplaint = 'SERVICE_COMPLAINT',
  Behavioural = 'BEHAVIOURAL',
  Other = 'OTHER',
}

/** The human readable label for an incident category, shown in the table. */
export const INCIDENT_CATEGORY_LABELS: Record<IncidentCategory, string> = {
  [IncidentCategory.MedicationConcern]: 'Medication Concern',
  [IncidentCategory.RecipientFall]: 'Recipient Fall',
  [IncidentCategory.ServiceComplaint]: 'Service Complaint',
  [IncidentCategory.Behavioural]: 'Behavioural',
  [IncidentCategory.Other]: 'Other',
};
