/** A person and how to reach them, for the family member and emergency contact. */
export interface ContactResult {
  name: string;
  relationship: string | null;
  phone: string | null;
}

export interface ProfileHeaderResult {
  id: string;
  code: string;
  name: string;
  photoKey: string | null;
  age: number;
  gender: string;
  status: string;
  priority: string;
  primaryDiagnosis: string | null;
  careLevel: string | null;
}

export interface PersonalInformationResult {
  /** Not captured on the recipient record yet; null until modelled. */
  phone: string | null;
  email: string | null;
  address: string;
  dateOfBirth: Date;
  age: number;
  familyMember: ContactResult | null;
  /** Not captured yet; empty until modelled. */
  languages: string[];
}

export interface CareSummaryResult {
  careLevel: string | null;
  startDate: Date | null;
  primaryDiagnosis: string | null;
  secondaryDiagnoses: string[];
  primaryCaregiverName: string | null;
  /** Office set role, deferred; null until the care team admin surface exists. */
  coordinatorName: string | null;
  nextScheduledVisitAt: Date | null;
  emergencyContact: ContactResult | null;
}

export interface QuickStatsResult {
  totalVisitsThisMonth: number;
  careHoursThisMonth: number;
  /** Average satisfaction (1 to 5); null until ratings capture exists. */
  avgSatisfaction: number | null;
  missedOrLateThisMonth: number;
  activeCareAlerts: number;
}

export interface MedicationResult {
  name: string;
  dose: string | null;
  scheduleMinute: number | null;
}

export interface CareTeamMemberResult {
  caregiverId: string;
  name: string;
  role: string;
  active: boolean;
}

export interface RecentVisitResult {
  id: string;
  date: Date;
  startMinute: number;
  caregiverName: string | null;
  type: string;
  durationMinutes: number | null;
  status: string;
}

export interface UpcomingVisitResult {
  id: string;
  date: Date;
  startMinute: number;
  description: string;
  caregiverName: string | null;
}

export interface CareNoteResult {
  authorName: string | null;
  audience: string;
  at: Date;
  text: string;
}

export interface CareRecipientProfileResult {
  header: ProfileHeaderResult;
  personalInformation: PersonalInformationResult;
  careSummary: CareSummaryResult;
  quickStats: QuickStatsResult;
  medications: MedicationResult[];
  careTeam: CareTeamMemberResult[];
  recentVisits: RecentVisitResult[];
  upcomingVisits: UpcomingVisitResult[];
  latestNotes: CareNoteResult[];
}
