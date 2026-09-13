/** One recorded set of vital signs, scoped to a recipient across their visits. */
export interface VitalsReadingView {
  systolic: number | null;
  diastolic: number | null;
  heartRate: number | null;
  oxygenSaturation: number | null;
  weightGrams: number | null;
  temperatureTenths: number | null;
  bloodGlucose: number | null;
  recordedAt: Date;
}

/**
 * Read port over the visits context's recorded vital signs, for the admin Health
 * screen. Returns the recipient's recent readings (across all their visits) so the
 * use case can derive the last vitals card and the vitals trend sparklines.
 */
export interface RecipientVitalsDirectory {
  recentReadings(recipientId: string, limit: number): Promise<VitalsReadingView[]>;
}

export const RECIPIENT_VITALS_DIRECTORY = Symbol('RECIPIENT_VITALS_DIRECTORY');
