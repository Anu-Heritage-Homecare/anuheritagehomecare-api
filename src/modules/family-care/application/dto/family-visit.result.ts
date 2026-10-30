/** A visit as it appears in the family owner's visits list. */
export interface FamilyVisitSummaryResult {
  id: string;
  status: string;
  date: string;
  startMinute: number;
  endMinute: number;
  clockInAt: string | null;
  clockOutAt: string | null;
  caregiver: { id: string; name: string; photoKey: string | null } | null;
}

export interface FamilyVisitsResult {
  currentVisit: FamilyVisitSummaryResult | null;
  pastVisits: FamilyVisitSummaryResult[];
}

export type FamilyTimelineKind =
  'ARRIVED' | 'DEPARTED' | 'TASK' | 'MEDICATION' | 'VITALS' | 'BREAK';

export interface FamilyTimelineEventResult {
  /** When the event happened, or null for an upcoming (not yet done) step. */
  at: string | null;
  kind: FamilyTimelineKind;
  /** Whether the step has happened or is still upcoming (drives the greyed row). */
  status: 'DONE' | 'UPCOMING';
  label: string;
  detail: string | null;
}

export interface FamilyVisitHealthResult {
  vitals: {
    systolic: number | null;
    diastolic: number | null;
    heartRate: number | null;
    temperatureCelsius: number | null;
    oxygenSaturation: number | null;
    recordedAt: string;
  } | null;
  observation: {
    mood: string | null;
    appetite: string | null;
    mobility: string | null;
    medicationStatus: string | null;
  };
}

export interface FamilyVisitNoteResult {
  authorId: string | null;
  authorName: string | null;
  authorRole: string | null;
  authorPhotoKey: string | null;
  at: string;
  audience: 'CARE_TEAM' | 'FAMILY';
  text: string;
}

/** The full visit detail a family owner sees, with all of its tabs. */
export interface FamilyVisitDetailResult {
  id: string;
  status: string;
  date: string;
  startMinute: number;
  endMinute: number;
  clockInAt: string | null;
  clockOutAt: string | null;
  caregiver: { id: string; name: string; photoKey: string | null } | null;
  recipient: { id: string; name: string; gender: string; age: number; photoKey: string | null };
  timeline: FamilyTimelineEventResult[];
  tasks: { label: string; completed: boolean }[];
  health: FamilyVisitHealthResult;
  notes: FamilyVisitNoteResult[];
  photos: { key: string; url: string }[];
}
