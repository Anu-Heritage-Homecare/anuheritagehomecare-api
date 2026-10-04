/**
 * The category of an admin written caregiver note. The caregiver's own Visit Notes
 * are composed separately from the visits context, so they are not a kind here.
 */
export enum CaregiverNoteKind {
  Supervisor = 'SUPERVISOR',
  Internal = 'INTERNAL',
  Training = 'TRAINING',
}

export const ALL_CAREGIVER_NOTE_KINDS: CaregiverNoteKind[] = Object.values(CaregiverNoteKind);
