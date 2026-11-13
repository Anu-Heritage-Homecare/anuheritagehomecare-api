/** The Workforce Report KPI strip. */
export interface WorkforceKpisResult {
  activeCaregivers: number;
  staffedPercent: number | null;
  utilizationPercent: number | null;
  utilizationTargetPercent: number;
  attendancePercent: number | null;
  avgPerformance: number | null;
  trainingCompliancePercent: number | null;
}

/** One bar of the Caregiver Utilization by Week chart. */
export interface WeeklyUtilizationResult {
  label: string;
  utilizationPercent: number | null;
}

/** One point of the Attendance Trend. */
export interface AttendancePointResult {
  date: string;
  attendancePercent: number | null;
}

/** The performance rating bands. */
export type RatingBand = 'OUTSTANDING' | 'GOOD' | 'SATISFACTORY' | 'NEEDS_IMPROVEMENT';

/** One row of the Performance Rating Distribution. */
export interface RatingDistributionResult {
  band: RatingBand;
  caregivers: number;
  percent: number;
}

/** One row of the Top Caregivers ranking. */
export interface TopCaregiverResult {
  rank: number;
  caregiverId: string;
  name: string;
  photoKey: string | null;
  rating: number | null;
  visitsCompleted: number;
  onTimeRatePercent: number | null;
  attendancePercent: number | null;
  csatScore: number | null;
}

/** The Training & Compliance Status donut. */
export interface TrainingComplianceResult {
  compliant: number;
  overdue: number;
  compliantPercent: number | null;
}

/** The urgency of an expiring certification. */
export type CertificationUrgency = 'ACTION_REQUIRED' | 'GRACE_PERIOD' | 'SCHEDULED';

/** One row of Expiring Certifications. */
export interface ExpiringCertificationResult {
  caregiverId: string;
  caregiverName: string;
  credentialName: string;
  expiresAt: string;
  daysUntilExpiry: number;
  status: CertificationUrgency;
}

/** One caregiver flagged for operational review. */
export interface FlaggedCaregiverResult {
  caregiverId: string;
  name: string;
  photoKey: string | null;
  reason: string;
  attendancePercent: number | null;
  lateArrivals: number;
}

/** The whole Workforce Report drill down for a period and filter set. */
export interface WorkforceReportResult {
  from: string;
  to: string;
  kpis: WorkforceKpisResult;
  weeklyUtilization: WeeklyUtilizationResult[];
  attendanceTrend: AttendancePointResult[];
  ratingDistribution: RatingDistributionResult[];
  topCaregivers: TopCaregiverResult[];
  trainingCompliance: TrainingComplianceResult;
  expiringCertifications: ExpiringCertificationResult[];
  flaggedForReview: FlaggedCaregiverResult[];
}
