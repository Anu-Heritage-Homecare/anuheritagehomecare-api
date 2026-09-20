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
  name: string;
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
  phone: string | null;
  email: string | null;
  address: string | null;
  dateOfBirth: Date | null;
  languages: string[];
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  emergencyContactRelationship: string | null;
  skills: string[];
  assignments: CaregiverAssignmentView[];
  todaySchedule: CaregiverTodayVisitView[];
  performance: CaregiverPerformanceView;
  certifications: CaregiverCertificationView[];
  availability: CaregiverAvailabilityDayView[];
  recentNotes: { body: string; authorName: string | null; createdAt: Date }[];
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
}

export const CAREGIVER_READ_MODEL = Symbol('CAREGIVER_READ_MODEL');
