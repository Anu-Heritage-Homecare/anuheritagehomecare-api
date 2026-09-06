import { AlertSeverity } from '../../domain/alert-severity.enum';
import { AlertStatus } from '../../domain/alert-status.enum';
import { AlertType } from '../../domain/alert-type.enum';
import { OperationalAlert } from '../../domain/operational-alert.entity';

/** An operational alert as the dashboard and the alerts list need it. */
export interface AlertResult {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  coordinatorName: string | null;
  status: AlertStatus;
  relatedVisitId: string | null;
  relatedCaregiverId: string | null;
  relatedCareRecipientId: string | null;
  createdAt: Date;
}

export function toAlertResult(alert: OperationalAlert): AlertResult {
  return {
    id: alert.id,
    type: alert.type,
    severity: alert.severity,
    title: alert.title,
    description: alert.description,
    coordinatorName: alert.coordinatorName,
    status: alert.status,
    relatedVisitId: alert.relatedVisitId,
    relatedCaregiverId: alert.relatedCaregiverId,
    relatedCareRecipientId: alert.relatedCareRecipientId,
    createdAt: alert.createdAt,
  };
}
