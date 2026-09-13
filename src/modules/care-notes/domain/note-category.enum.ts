/**
 * The kind of care note on a recipient's activity log. Drives the filter tabs and
 * counts on the admin Notes screen: a caregiver visit note, a clinical observation,
 * a coordinator entry, a family communication or an incident report.
 */
export enum NoteCategory {
  VisitNote = 'VISIT_NOTE',
  Clinical = 'CLINICAL',
  Coordinator = 'COORDINATOR',
  FamilyCommunication = 'FAMILY_COMMUNICATION',
  Incident = 'INCIDENT',
}

/** Every valid category, used to validate incoming values at the boundary. */
export const ALL_NOTE_CATEGORIES: readonly NoteCategory[] = Object.values(NoteCategory);
