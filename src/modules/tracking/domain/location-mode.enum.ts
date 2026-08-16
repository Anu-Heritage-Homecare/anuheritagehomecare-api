/**
 * Why a location point was reported. NAVIGATION points are sent frequently while
 * a caregiver is travelling to a visit; BACKGROUND points are the occasional
 * heartbeat sent the rest of the time. The distinction lets the admin audit
 * separate a journey from ambient tracking.
 */
export enum LocationMode {
  Navigation = 'NAVIGATION',
  Background = 'BACKGROUND',
}

/** Every valid location mode, used to validate incoming values. */
export const ALL_LOCATION_MODES: readonly LocationMode[] = Object.values(LocationMode);
