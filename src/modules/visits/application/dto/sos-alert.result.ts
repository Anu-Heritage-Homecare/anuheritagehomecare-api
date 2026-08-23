import { SosAlert } from '../../domain/sos-alert.entity';
import { SosAlertStatus } from '../../domain/sos-alert-status.enum';

/** The state of an SOS alert after it is raised or cancelled. */
export interface SosAlertResult {
  id: string;
  visitId: string;
  status: SosAlertStatus;
  recipient: {
    careRecipientId: string;
    name: string | null;
    address: string | null;
  };
  createdAt: string;
  cancelledAt: string | null;
}

export function toSosAlertResult(alert: SosAlert): SosAlertResult {
  return {
    id: alert.id,
    visitId: alert.visitId,
    status: alert.status,
    recipient: {
      careRecipientId: alert.recipient.careRecipientId,
      name: alert.recipient.name,
      address: alert.recipient.address,
    },
    createdAt: alert.createdAt.toISOString(),
    cancelledAt: alert.cancelledAt === null ? null : alert.cancelledAt.toISOString(),
  };
}
