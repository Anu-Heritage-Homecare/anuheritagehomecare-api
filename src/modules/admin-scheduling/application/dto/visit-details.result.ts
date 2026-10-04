/** One checklist task on the visit. */
export interface VisitTaskResult {
  label: string;
  completed: boolean;
  status: string;
}

/** One note on the visit. */
export interface VisitNoteResult {
  authorName: string;
  authorRole: string;
  audience: string;
  text: string;
  at: string;
}

/** The Visit Information panel. */
export interface VisitInformationResult {
  date: string;
  time: string;
  endTime: string;
  durationHours: number;
  serviceType: string;
  priority: string;
  status: string;
  location: string;
  recurring: string;
}

/** The Overview tab. */
export interface VisitOverviewResult {
  information: VisitInformationResult;
  tasks: { summary: string; completed: number; total: number; items: VisitTaskResult[] };
  notes: VisitNoteResult[];
}

/** The Care Recipient tab/card. */
export interface VisitRecipientResult {
  id: string;
  name: string;
  age: number | null;
  gender: string;
  primaryCondition: string | null;
  careLevel: string | null;
  address: string;
  emergencyContact: { name: string; phone: string; relationship: string | null } | null;
  conditions: string[];
  allergies: string[];
  careNeeds: string[];
  medications: { name: string; dose: string | null; times: string[] }[];
}

/** The Assigned Caregiver tab/card. */
export interface VisitCaregiverResult {
  id: string;
  name: string;
  title: string | null;
  branch: string | null;
  onVisit: boolean;
  clockIn: string | null;
  performanceRating: number | null;
}

/** The Care Plan tab. */
export interface VisitCarePlanResult {
  serviceType: string;
  frequency: string | null;
  days: string[];
  startTime: string | null;
  durationHours: number;
  expectedDuration: string | null;
  services: string[];
  instructions: string[];
  goals: string[];
}

/** One event on the Visit Timeline / History tab. */
export interface VisitTimelineEventResult {
  type: string;
  label: string;
  at: string;
}

/** One related (previous or next) visit. */
export interface RelatedVisitResult {
  id: string;
  date: string;
  label: string;
  status: string;
}

/** The full composed Visit Details, one section per tab. */
export interface VisitDetailResult {
  id: string;
  status: string;
  statusLabel: string;
  serviceType: string;
  priority: string;
  actions: { canEdit: boolean; canReassign: boolean; canCancel: boolean };
  overview: VisitOverviewResult;
  recipient: VisitRecipientResult;
  caregiver: VisitCaregiverResult | null;
  carePlan: VisitCarePlanResult;
  notes: VisitNoteResult[];
  history: VisitTimelineEventResult[];
  relatedVisits: { previous: RelatedVisitResult | null; next: RelatedVisitResult | null };
}
