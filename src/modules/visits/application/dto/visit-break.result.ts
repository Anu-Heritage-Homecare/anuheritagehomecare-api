import { Visit } from '../../domain/visit.entity';
import { VisitStatus } from '../../domain/visit-status.enum';

/** The break state of a visit after starting or ending a break. */
export interface VisitBreakResult {
  id: string;
  status: VisitStatus;
  breakSeconds: number;
  onBreakSince: string | null;
}

export function toVisitBreak(visit: Visit): VisitBreakResult {
  return {
    id: visit.id,
    status: visit.status,
    breakSeconds: visit.breakSeconds,
    onBreakSince: visit.onBreakSince === null ? null : visit.onBreakSince.toISOString(),
  };
}
