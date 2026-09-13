export interface CaregiversSummaryResult {
  assignedCaregivers: number;
  totalCareHoursThisMonth: number;
  /** Change in total care hours versus the prior month, in whole hours. */
  careHoursTrend: number;
  /** Assigned coverage blocks over the total defined, as a percentage. */
  coverageRatePercent: number;
}

export interface CareTeamMemberResult {
  assignmentId: string;
  caregiverId: string;
  name: string | null;
  photoKey: string | null;
  role: string;
  /** Display status derived from the role (backups surface as Available). */
  status: string;
  specialization: string | null;
  scheduleLabel: string | null;
  hoursThisMonth: number;
  /** Per caregiver satisfaction rating, null until caregiver ratings are captured. */
  rating: number | null;
  certifications: string[];
}

export interface CoverageBlockResult {
  weekday: string;
  slot: string;
  caregiverId: string | null;
  caregiverName: string | null;
}

export interface AssignmentHistoryResult {
  at: Date;
  action: string;
  caregiverId: string;
  caregiverName: string | null;
  reason: string;
  byName: string | null;
}

export interface RecipientCaregiversResult {
  summary: CaregiversSummaryResult;
  team: CareTeamMemberResult[];
  coverage: CoverageBlockResult[];
  history: AssignmentHistoryResult[];
}
