import { VisitStatus } from '../../domain/visit-status.enum';

/** One entry in a caregiver's schedule: a visit joined to its recipient's card. */
export interface VisitCardResult {
  id: string;
  status: VisitStatus;
  date: string;
  startMinute: number;
  endMinute: number;
  recipient: {
    id: string;
    name: string;
    gender: string;
    age: number;
    careNeeds: string[];
    address: string;
    photoKey: string | null;
  };
}

/** A caregiver's schedule over the requested day or range. */
export interface ScheduleResult {
  from: string;
  to: string;
  visits: VisitCardResult[];
}
