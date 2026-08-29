/** How a recipient is doing right now, derived from today's visit status. */
export type RecipientCareState =
  'RECEIVING_CARE' | 'ON_BREAK' | 'SCHEDULED' | 'COMPLETED' | 'NO_VISIT_TODAY';

/** The kind of activity a recent update represents. */
export type DashboardUpdateKind = 'MEDICATION' | 'VITALS' | 'TASK';

export interface DashboardGreetingResult {
  ownerFirstName: string;
  recipientName: string | null;
}

export interface DashboardProgressResult {
  completed: number;
  total: number;
  percent: number;
}

export interface DashboardTaskResult {
  label: string;
  completed: boolean;
}

export interface DashboardCaregiverResult {
  id: string;
  name: string;
  photoKey: string | null;
}

export interface DashboardUpdateResult {
  at: string;
  kind: DashboardUpdateKind;
  label: string;
}

export interface DashboardTodayVisitResult {
  id: string;
  status: string;
  startedAt: string | null;
  scheduledStartMinute: number;
  estimatedFinishMinute: number;
  progress: DashboardProgressResult;
  tasks: DashboardTaskResult[];
  caregiver: DashboardCaregiverResult | null;
}

export interface DashboardRecipientResult {
  id: string;
  name: string;
  gender: string;
  age: number;
  photoKey: string | null;
  careState: RecipientCareState;
  todayVisit: DashboardTodayVisitResult | null;
  recentUpdates: DashboardUpdateResult[];
}

export interface FamilyDashboardResult {
  greeting: DashboardGreetingResult;
  recipients: DashboardRecipientResult[];
}
