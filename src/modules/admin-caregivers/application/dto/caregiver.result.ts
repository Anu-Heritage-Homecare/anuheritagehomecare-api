export interface CaregiverRowResult {
  id: string;
  reference: string;
  name: string;
  title: string | null;
  branch: string | null;
  employmentType: string | null;
  status: string;
}

export interface CaregiverListResult {
  total: number;
  page: number;
  pageSize: number;
  rows: CaregiverRowResult[];
}

export interface CaregiverAssignmentResult {
  recipientName: string;
  role: string;
  since: string;
}

export interface CaregiverTodayVisitResult {
  time: string;
  recipientName: string;
  visitType: string;
  status: string;
}

export interface CaregiverPerformanceResult {
  ratingAverage: number | null;
  ratingCount: number;
  satisfactionPercent: number | null;
  taskCompletionPercent: number | null;
  /** Punctuality needs timezone aware arrival timing; not computed yet. */
  punctualityPercent: number | null;
  visitsThisMonth: number;
  hoursLogged: number;
  missedVisits: number;
}

export interface CaregiverCertificationResult {
  id: string;
  name: string;
  licenseNumber: string | null;
  issuedAt: string | null;
  expiresAt: string;
  valid: boolean;
}

export interface CaregiverAvailabilityDayResult {
  dayLabel: string;
  date: string;
  available: boolean;
  slots: { startMinute: number; endMinute: number; label: string }[];
}

export interface CaregiverNoteResult {
  body: string;
  authorName: string | null;
  createdAt: string;
}

export interface CaregiverOverviewResult {
  id: string;
  reference: string;
  name: string;
  status: string;
  title: string | null;
  branch: string | null;
  employmentType: string | null;
  experienceYears: number | null;
  joinedAt: string | null;
  supervisorName: string | null;
  maxHoursPerWeek: number | null;
  preferredShift: string | null;
  preferencesNote: string | null;
  hourlyRateMinor: number | null;
  payCurrency: string | null;
  personal: {
    gender: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    dateOfBirth: string | null;
    age: number | null;
    languages: string[];
    emergencyContactName: string | null;
    emergencyContactPhone: string | null;
    emergencyContactRelationship: string | null;
    emergencyContactEmail: string | null;
  };
  assignments: CaregiverAssignmentResult[];
  todaySchedule: CaregiverTodayVisitResult[];
  performance: CaregiverPerformanceResult;
  certifications: CaregiverCertificationResult[];
  fullyCompliant: boolean;
  skills: string[];
  availability: CaregiverAvailabilityDayResult[];
  recentNotes: CaregiverNoteResult[];
}
