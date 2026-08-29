import { AdditionalCareRequest } from '../../domain/additional-care-request.entity';
import { CareRequestStatus } from '../../domain/care-request-status.enum';

/** The stored outcome of submitting an additional care request. */
export interface CareRequestResult {
  id: string;
  careRecipientId: string;
  careType: string;
  requestedDate: string;
  startMinute: number;
  durationMinutes: number;
  reason: string | null;
  status: CareRequestStatus;
  createdAt: string;
}

export function toCareRequestResult(request: AdditionalCareRequest): CareRequestResult {
  return {
    id: request.id,
    careRecipientId: request.careRecipientId,
    careType: request.careType,
    requestedDate: request.requestedDate.toISOString().slice(0, 10),
    startMinute: request.startMinute,
    durationMinutes: request.durationMinutes,
    reason: request.reason,
    status: request.status,
    createdAt: request.createdAt.toISOString(),
  };
}
