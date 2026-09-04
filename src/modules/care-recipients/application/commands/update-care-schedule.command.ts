/** Command to record the care schedule captured on the fourth wizard step. */
export interface UpdateCareScheduleCommand {
  ownerId: string;
  careRecipientId: string;
  frequency: string;
  estimatedStartDate: string;
  expectedDuration: string;
  /** Weekdays the recurring visit falls on (optional). */
  days?: string[];
  /** Visit start time as minutes from midnight (optional). */
  startMinute?: number | null;
  /** How long a single visit lasts, in minutes (optional). */
  visitDurationMinutes?: number | null;
}
