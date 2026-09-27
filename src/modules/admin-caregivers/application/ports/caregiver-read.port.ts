import { CaregiverStatus as PrismaCaregiverStatus } from '@prisma/client';

/** One row of the caregivers directory. */
export interface CaregiverRowView {
  id: string;
  reference: string;
  name: string;
  title: string | null;
  branch: string | null;
  employmentType: string | null;
  status: PrismaCaregiverStatus;
}

export interface CaregiverPageView {
  total: number;
  rows: CaregiverRowView[];
}

export interface CaregiverAssignmentView {
  recipientName: string;
  role: string;
  since: Date;
}

export interface CaregiverTodayVisitView {
  startMinute: number;
  recipientName: string;
  visitType: string;
  status: string;
}

export interface CaregiverCertificationView {
  id: string;
  name: string;
  licenseNumber: string | null;
  issuedAt: Date | null;
  expiresAt: Date;
  valid: boolean;
}

export interface CaregiverAvailabilityDayView {
  date: Date;
  slots: { startMinute: number; endMinute: number }[];
}

export interface CaregiverPerformanceView {
  ratingAverage: number | null;
  ratingCount: number;
  visitsThisMonth: number;
  hoursLoggedTenths: number;
  missedVisits: number;
  completedVisits: number;
}

/** The full composed Overview for one caregiver. */
export interface CaregiverOverviewView {
  id: string;
  reference: string;
  userId: string;
  name: string;
  status: PrismaCaregiverStatus;
  title: string | null;
  branch: string | null;
  employmentType: string | null;
  experienceYears: number | null;
  joinedAt: Date | null;
  gender: string | null;
  supervisorName: string | null;
  maxHoursPerWeek: number | null;
  preferredShift: string | null;
  preferencesNote: string | null;
  hourlyRateMinor: number | null;
  payCurrency: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  dateOfBirth: Date | null;
  languages: string[];
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  emergencyContactRelationship: string | null;
  emergencyContactEmail: string | null;
  skills: string[];
  assignments: CaregiverAssignmentView[];
  todaySchedule: CaregiverTodayVisitView[];
  performance: CaregiverPerformanceView;
  certifications: CaregiverCertificationView[];
  availability: CaregiverAvailabilityDayView[];
  recentNotes: { body: string; authorName: string | null; createdAt: Date }[];
}

/** One visit on the caregiver Schedule tab (within the week or the upcoming list). */
export interface CaregiverScheduleVisitView {
  scheduledDate: Date;
  startMinute: number;
  endMinute: number;
  recipientName: string;
  visitType: string;
  status: string;
}

/** The composed Schedule tab: the week's visits, the upcoming visits and availability. */
export interface CaregiverScheduleTabView {
  weekStart: Date;
  weekEnd: Date;
  maxHoursPerWeek: number | null;
  preferredShift: string | null;
  overtimeMultiplierBps: number | null;
  weekVisits: CaregiverScheduleVisitView[];
  upcomingVisits: CaregiverScheduleVisitView[];
  availability: CaregiverAvailabilityDayView[];
}

/** One visit in the performance scan window, with the timing the metrics derive from. */
export interface CaregiverPerformanceVisitView {
  scheduledDate: Date;
  startMinute: number;
  endMinute: number;
  status: string;
  clockInAt: Date | null;
  clockOutAt: Date | null;
  breakSeconds: number;
}

/** One rating in the performance scan window, with the reviewer snapshot. */
export interface CaregiverPerformanceRatingView {
  score: number;
  comment: string | null;
  reviewerType: string;
  reviewerName: string | null;
  reviewerRelationship: string | null;
  recipientName: string | null;
  traits: string[];
  createdAt: Date;
}

/** The raw material for the Performance tab: the scanned visits, ratings and coaching flags. */
export interface CaregiverPerformanceTabView {
  areasForGrowth: string[];
  visits: CaregiverPerformanceVisitView[];
  ratings: CaregiverPerformanceRatingView[];
}

/** One certification row for the Documents tab. */
export interface CaregiverCredentialView {
  id: string;
  name: string;
  kind: string;
  licenseNumber: string | null;
  issuedAt: Date | null;
  expiresAt: Date;
  documentKey: string | null;
  fileName: string | null;
  uploadedBy: string | null;
  createdAt: Date;
}

/** One employment document row for the Documents tab. */
export interface CaregiverDocumentRowView {
  id: string;
  name: string;
  category: string;
  status: string;
  documentDate: Date | null;
  documentKey: string | null;
  fileName: string | null;
  uploadedBy: string | null;
  createdAt: Date;
}

/** One training record row for the Documents tab. */
export interface CaregiverTrainingRowView {
  id: string;
  name: string;
  status: string;
  completedAt: Date | null;
  certificate: boolean;
  hoursCompleted: number;
  hoursRequired: number | null;
  documentKey: string | null;
  fileName: string | null;
  uploadedBy: string | null;
  createdAt: Date;
}

/** The raw material for the Documents tab: credentials, documents and training. */
export interface CaregiverDocumentsTabView {
  credentials: CaregiverCredentialView[];
  documents: CaregiverDocumentRowView[];
  trainings: CaregiverTrainingRowView[];
}

/**
 * Read model over the caregiver profile overlay, composed with the identity user,
 * assignments, visits, ratings, certifications and availability.
 */
export interface CaregiverReadModel {
  list(
    status: PrismaCaregiverStatus | null,
    page: number,
    pageSize: number,
  ): Promise<CaregiverPageView>;
  overview(profileId: string, now: Date): Promise<CaregiverOverviewView | null>;
  scheduleTab(
    profileId: string,
    weekStart: Date,
    now: Date,
    upcomingLimit: number,
  ): Promise<CaregiverScheduleTabView | null>;
  performanceTab(profileId: string, now: Date): Promise<CaregiverPerformanceTabView | null>;
  documentsTab(profileId: string): Promise<CaregiverDocumentsTabView | null>;
}

export const CAREGIVER_READ_MODEL = Symbol('CAREGIVER_READ_MODEL');
