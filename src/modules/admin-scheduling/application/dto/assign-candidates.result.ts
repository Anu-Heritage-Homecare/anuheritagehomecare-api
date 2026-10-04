/** The visit header on the Assign Caregiver screen. */
export interface AssignVisitHeaderResult {
  id: string;
  recipientName: string;
  serviceType: string;
  priority: string;
  date: string;
  time: string;
  endTime: string;
  durationHours: number;
  location: string;
}

/** One certification chip on a candidate card. */
export interface CandidateCertificationResult {
  name: string;
  valid: boolean;
}

/** A candidate's availability at the visit time. */
export interface CandidateAvailabilityResult {
  status: 'AVAILABLE' | 'AVAILABLE_LATER' | 'BUSY' | 'OFF_DUTY';
  label: string;
}

/** A candidate's eligibility verdict for this assignment. */
export interface CandidateEligibilityResult {
  status: 'OK' | 'WARN' | 'BLOCKED_CONFLICT' | 'INELIGIBLE';
  assignable: boolean;
  reason: string | null;
}

/** One ranked caregiver on the Assign Caregiver screen. */
export interface AssignCandidateResult {
  caregiverId: string;
  name: string;
  title: string | null;
  branch: string | null;
  bestMatch: boolean;
  matchScore: number;
  availability: CandidateAvailabilityResult;
  distanceMiles: number | null;
  load: { completed: number; total: number; label: string };
  rating: number | null;
  certifications: CandidateCertificationResult[];
  skills: string[];
  eligibility: CandidateEligibilityResult;
}

/** The composed Assign Caregiver screen. */
export interface AssignCandidatesResult {
  visit: AssignVisitHeaderResult;
  requiredCertification: string | null;
  total: number;
  candidates: AssignCandidateResult[];
}
