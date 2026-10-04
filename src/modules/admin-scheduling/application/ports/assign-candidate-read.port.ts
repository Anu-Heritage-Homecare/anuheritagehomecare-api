/** The visit an assignment is being made for. */
export interface AssignVisitContext {
  id: string;
  status: string;
  recipientName: string;
  serviceType: string;
  priority: string;
  scheduledDate: Date;
  startMinute: number;
  endMinute: number;
  location: string;
  recipientLatitude: number | null;
  recipientLongitude: number | null;
}

/** One of the caregiver's visits on the target date, for conflict and load. */
export interface CandidateVisit {
  startMinute: number;
  endMinute: number;
  status: string;
}

/** One of the caregiver's certifications, for the eligibility check. */
export interface CandidateCertification {
  name: string;
  expiresAt: Date;
}

/** A caregiver considered for the assignment, with everything the match needs. */
export interface AssignCandidateRaw {
  caregiverId: string;
  name: string;
  title: string | null;
  branch: string | null;
  skills: string[];
  ratingAverage: number | null;
  ratingCount: number;
  certifications: CandidateCertification[];
  dayVisits: CandidateVisit[];
  availabilityWindows: { startMinute: number; endMinute: number }[];
  lastLatitude: number | null;
  lastLongitude: number | null;
}

/** The full context for the Assign Caregiver screen. */
export interface AssignMatchContext {
  visit: AssignVisitContext;
  candidates: AssignCandidateRaw[];
}

/**
 * Read model for the Assign Caregiver screen. Loads the unassigned visit plus every
 * active caregiver with the data the match needs (their visits on the day, their
 * availability windows, certifications, rating and last known location), all batched.
 */
export interface AssignCandidateReadModel {
  matchContext(visitId: string): Promise<AssignMatchContext | null>;
}

export const ASSIGN_CANDIDATE_READ_MODEL = Symbol('ASSIGN_CANDIDATE_READ_MODEL');
