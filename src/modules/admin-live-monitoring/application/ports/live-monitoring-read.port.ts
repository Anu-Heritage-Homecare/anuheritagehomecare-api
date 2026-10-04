/** A medication administration event on a visit, for the activity feed. */
export interface LiveMedicationEvent {
  recordedAt: Date;
  outcome: string;
}

/** A vitals reading on a visit, for the activity feed. */
export interface LiveVitalsEvent {
  recordedAt: Date;
  systolic: number | null;
  diastolic: number | null;
  heartRate: number | null;
}

/** One visit scheduled today, hydrated with the names, branch and coordinates. */
export interface LiveVisitRow {
  id: string;
  status: string;
  caregiverId: string | null;
  careRecipientId: string;
  startMinute: number;
  endMinute: number;
  visitType: string;
  priority: string;
  clockInAt: Date | null;
  clockOutAt: Date | null;
  recipientName: string;
  caregiverName: string | null;
  caregiverBranch: string | null;
  recipientLatitude: number | null;
  recipientLongitude: number | null;
  medications: LiveMedicationEvent[];
  vitals: LiveVitalsEvent[];
}

/** One active SOS alert, hydrated with the caregiver name. */
export interface LiveSosRow {
  id: string;
  caregiverId: string;
  caregiverName: string | null;
  recipientName: string | null;
  recipientAddress: string | null;
  latitude: number | null;
  longitude: number | null;
  createdAt: Date;
  dispatchedAt: Date | null;
}

/** The latest known location of a caregiver, for the map. */
export interface LiveCaregiverLocation {
  caregiverId: string;
  latitude: number;
  longitude: number;
}

/** The whole live snapshot for a day. */
export interface LiveSnapshot {
  visits: LiveVisitRow[];
  sosAlerts: LiveSosRow[];
  caregiverLocations: LiveCaregiverLocation[];
}

/**
 * Read model for the admin Live Monitoring screen. Loads the day's visits hydrated
 * with recipient and caregiver names, branch and coordinates, the active SOS alerts
 * and the latest caregiver locations, all batched.
 */
export interface LiveMonitoringReadModel {
  snapshot(dayStart: Date, nextDay: Date): Promise<LiveSnapshot>;
}

export const LIVE_MONITORING_READ_MODEL = Symbol('LIVE_MONITORING_READ_MODEL');
