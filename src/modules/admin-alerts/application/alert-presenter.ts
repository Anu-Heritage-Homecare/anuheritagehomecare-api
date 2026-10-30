import { AlertType } from '../domain/alert-type.enum';

const TYPE_LABELS: Record<AlertType, string> = {
  [AlertType.LateCaregiver]: 'Late Check-in',
  [AlertType.MissedClockIn]: 'Missed Check-in',
  [AlertType.VisitOverdue]: 'Visit Overdue',
  [AlertType.LocationVerificationFailed]: 'Location Failed',
  [AlertType.CertificationExpiring]: 'Certification Expiring',
  [AlertType.MedicationIssue]: 'Medication Issue',
  [AlertType.General]: 'Alert',
};

/** The display label for an operational alert type, shown in the table. */
export function alertTypeLabel(type: AlertType): string {
  return TYPE_LABELS[type];
}
