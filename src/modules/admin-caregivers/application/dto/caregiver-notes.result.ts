/** One entry in the Notes tab feed. */
export interface CaregiverNoteEntryResult {
  id: string;
  type: string;
  typeLabel: string;
  authorName: string;
  authorRole: string | null;
  bySelf: boolean;
  text: string;
  date: string;
}

/** The composed caregiver Notes tab. */
export interface CaregiverNotesTabResult {
  counts: { total: number; thisMonth: number; internal: number };
  range: { from: string; to: string };
  notes: {
    total: number;
    page: number;
    pageSize: number;
    rows: CaregiverNoteEntryResult[];
  };
}
