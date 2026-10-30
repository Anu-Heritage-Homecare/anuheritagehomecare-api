/**
 * The kind of an appended SOS response timeline entry that is not derivable from
 * the SOS alert itself. Structural events (raised, acknowledged, assigned) are
 * derived from the alert and are not stored as events.
 */
export enum SosResponseEventKind {
  Callback = 'CALLBACK',
  GeofenceCheck = 'GEOFENCE_CHECK',
  IncidentLogged = 'INCIDENT_LOGGED',
  Note = 'NOTE',
}
