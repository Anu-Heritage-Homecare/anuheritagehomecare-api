/** A vitals reading recorded under a task (for the Care Tasks tab). */
export interface VisitTaskVitalsResult {
  summary: string;
  recordedAt: string;
}

/** A medication administered under a task (for the Care Tasks tab). */
export interface VisitTaskMedicationResult {
  name: string;
  dose: string | null;
  outcome: string;
}

/** One checklist task on the visit, with its care activity detail. */
export interface VisitTaskResult {
  label: string;
  category: string;
  completed: boolean;
  /** PENDING, IN_PROGRESS or COMPLETED, derived from the started and completed times. */
  status: string;
  /** The planned time of day ("5:30 PM"), or null. */
  scheduledTime: string | null;
  startedAt: string | null;
  completedAt: string | null;
  durationMinutes: number | null;
  note: string | null;
  vitals: VisitTaskVitalsResult[];
  medications: VisitTaskMedicationResult[];
}

/** One reply on a visit note. */
export interface VisitNoteReplyResult {
  authorName: string;
  authorRole: string;
  text: string;
  at: string;
}

/** One note on the visit, with its source, author, state and replies. */
export interface VisitNoteResult {
  id: string;
  source: string;
  authorName: string;
  authorRole: string;
  audience: string;
  text: string;
  at: string;
  acknowledged: boolean;
  acknowledgedByName: string | null;
  flaggedForCoordinator: boolean;
  edited: boolean;
  /** Whether a coordinator may edit this note (coordinator notes only). */
  canEdit: boolean;
  replies: VisitNoteReplyResult[];
}

/** The Notes tab: the pill counts and the note feed. */
export interface VisitNotesResult {
  counts: { all: number; caregiver: number; coordinator: number; system: number };
  items: VisitNoteResult[];
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

// The top-level `notes` field on VisitDetailResult (the Notes tab) is VisitNotesResult.

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
  /** The second line of the event (a reading, a note), or null. */
  detail: string | null;
  at: string;
  /** DONE for an event that happened, IN_PROGRESS for a started task, UPCOMING for a planned one. */
  status: string;
}

/** One related (previous or next) visit. */
export interface RelatedVisitResult {
  id: string;
  date: string;
  label: string;
  status: string;
}

/**
 * The Location and Check-in tab: the geofenced clock-in/out and the scheduled window.
 * The scheduled instants let a live screen tick elapsed, remaining and progress; a
 * verified check-in means the clock-in was accepted inside the geofence.
 */
export interface VisitCheckInResult {
  verified: boolean;
  clockInAt: string | null;
  clockOutAt: string | null;
  arrivalLatitude: number | null;
  arrivalLongitude: number | null;
  scheduledStart: string;
  scheduledEnd: string;
}

/** One entry in the Real-time Operational Logs on the Location and Check-in tab. */
export interface VisitLocationLogResult {
  type: string;
  label: string;
  method: string;
  at: string;
  status: string;
}

/** The Location and Check-in tab: the geofence verification and the location log. */
export interface VisitLocationResult {
  address: string;
  geofenceRadiusMeters: number;
  /** Distance from the accepted check-in point to the pinned address centre, in metres. */
  checkInVarianceMeters: number | null;
  checkInWithinRange: boolean | null;
  recipientLatitude: number | null;
  recipientLongitude: number | null;
  /** The caregiver's latest broadcast position (from the location pings). */
  currentLatitude: number | null;
  currentLongitude: number | null;
  currentOffsetMeters: number | null;
  lastPingAt: string | null;
  verificationPlan: string;
  logs: VisitLocationLogResult[];
}

/** The full composed Visit Details, one section per tab. */
export interface VisitDetailResult {
  id: string;
  /** VIS-<country>-<year>-<sequence>; the uuid is still `id`. */
  reference: string;
  status: string;
  statusLabel: string;
  serviceType: string;
  priority: string;
  checkIn: VisitCheckInResult;
  location: VisitLocationResult;
  actions: { canEdit: boolean; canReassign: boolean; canCancel: boolean };
  overview: VisitOverviewResult;
  recipient: VisitRecipientResult;
  caregiver: VisitCaregiverResult | null;
  carePlan: VisitCarePlanResult;
  notes: VisitNotesResult;
  history: VisitTimelineEventResult[];
  relatedVisits: { previous: RelatedVisitResult | null; next: RelatedVisitResult | null };
}
