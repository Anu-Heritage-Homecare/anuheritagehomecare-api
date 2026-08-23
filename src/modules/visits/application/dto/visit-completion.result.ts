import { Visit } from '../../domain/visit.entity';
import { VisitStatus } from '../../domain/visit-status.enum';

/**
 * The outcome of completing a visit, for the confirmation screen: the recipient
 * it was carried out with and how the time broke down. The server timestamps are
 * the source of truth for how long the visit took.
 */
export interface VisitCompletionResult {
  id: string;
  status: VisitStatus;
  recipientName: string | null;
  clockInAt: string | null;
  clockOutAt: string | null;
  activeSeconds: number;
  breakSeconds: number;
}

export function toVisitCompletion(
  visit: Visit,
  recipientName: string | null,
): VisitCompletionResult {
  return {
    id: visit.id,
    status: visit.status,
    recipientName,
    clockInAt: visit.clockInAt === null ? null : visit.clockInAt.toISOString(),
    clockOutAt: visit.clockOutAt === null ? null : visit.clockOutAt.toISOString(),
    activeSeconds: visit.activeSeconds ?? 0,
    breakSeconds: visit.breakSeconds,
  };
}
