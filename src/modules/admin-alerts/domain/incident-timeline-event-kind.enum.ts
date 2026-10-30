/**
 * The kind of an appended incident timeline entry. Structural events (reported,
 * resolved) are derived from the incident and are not stored as events.
 */
export enum IncidentTimelineEventKind {
  CoordinatorNotified = 'COORDINATOR_NOTIFIED',
  CaregiverContact = 'CAREGIVER_CONTACT',
  FamilyNotification = 'FAMILY_NOTIFICATION',
  ReviewStarted = 'REVIEW_STARTED',
  Note = 'NOTE',
  Other = 'OTHER',
}
