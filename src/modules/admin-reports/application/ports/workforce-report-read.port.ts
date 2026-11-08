import { CaregiverEmploymentType } from '@prisma/client';

/** The filters of the Workforce Report (branch, caregiver and employment type). */
export interface WorkforceReportFilter {
  from: Date;
  to: Date;
  /** The Branch dropdown, matched to the caregiver profile branch; null is All Branches. */
  branch: string | null;
  /** The Caregiver dropdown (a caregiver user id); null is All Caregivers. */
  caregiverId: string | null;
  /** The Employment Type dropdown; null is All Types. */
  employmentType: CaregiverEmploymentType | null;
  now: Date;
}

/** Per caregiver aggregates over the period, the basis for the ranking and distribution. */
export interface WorkforceCaregiverAggregate {
  caregiverId: string;
  name: string;
  photoKey: string | null;
  visitsTotal: number;
  visitsCompleted: number;
  visitsMissed: number;
  /** Visits the caregiver clocked in to. */
  started: number;
  /** Clock ins within the on time grace of the schedule. */
  onTime: number;
  loggedSeconds: number;
  /** Rating totals across all reviewers (the overall rating). */
  ratingSum: number;
  ratingCount: number;
  /** Rating totals from family reviewers only (the CSAT score). */
  csatSum: number;
  csatCount: number;
  /** True when the caregiver has an in progress (not completed) training. */
  hasIncompleteTraining: boolean;
}

/** One week bucket of the Caregiver Utilization by Week chart. */
export interface WorkforceWeeklyBucket {
  label: string;
  loggedSeconds: number;
  /** Days covered by the bucket (the final week of a period may be short). */
  days: number;
}

/** One day of the Attendance Trend. */
export interface WorkforceAttendanceDay {
  date: Date;
  total: number;
  /** Visits that day that were not missed. */
  nonMissed: number;
}

/** One certification due to expire inside the look ahead window. */
export interface WorkforceExpiringCertification {
  caregiverId: string;
  caregiverName: string;
  credentialName: string;
  expiresAt: Date;
  daysUntilExpiry: number;
}

/** The raw aggregates behind the Workforce Report; bands and rankings are derived in the use case. */
export interface WorkforceReportView {
  caregivers: WorkforceCaregiverAggregate[];
  /** Non archived caregivers, for the staffed percentage. */
  totalCaregivers: number;
  /** Sum of weekly capacity hours across the active caregivers in scope. */
  weeklyCapacityHours: number;
  weekly: WorkforceWeeklyBucket[];
  attendanceDaily: WorkforceAttendanceDay[];
  expiringCertifications: WorkforceExpiringCertification[];
}

/** Org wide read model for the Workforce Report drill down. */
export interface WorkforceReportReadModel {
  report(filter: WorkforceReportFilter): Promise<WorkforceReportView>;
}

export const WORKFORCE_REPORT_READ_MODEL = Symbol('WORKFORCE_REPORT_READ_MODEL');
