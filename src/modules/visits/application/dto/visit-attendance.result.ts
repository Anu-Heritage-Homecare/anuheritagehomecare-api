import { Visit } from '../../domain/visit.entity';
import { VisitStatus } from '../../domain/visit-status.enum';

/** The attendance state of a visit after a clock in or clock out. */
export interface VisitAttendanceResult {
  id: string;
  status: VisitStatus;
  clockInAt: string | null;
  clockOutAt: string | null;
}

export function toVisitAttendance(visit: Visit): VisitAttendanceResult {
  return {
    id: visit.id,
    status: visit.status,
    clockInAt: visit.clockInAt === null ? null : visit.clockInAt.toISOString(),
    clockOutAt: visit.clockOutAt === null ? null : visit.clockOutAt.toISOString(),
  };
}
