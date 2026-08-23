/**
 * How a worked visit counts toward pay. APPROVED entries are completed visits
 * whose hours are settled (clocked in and out); PENDING entries are visits still
 * to be completed, whose hours are an estimate awaiting approval. Cancelled and
 * missed visits never appear.
 */
export enum TimesheetEntryKind {
  Approved = 'APPROVED',
  Pending = 'PENDING',
}

/** One visit's contribution to a caregiver's timesheet for a pay period. */
export interface TimesheetEntry {
  kind: TimesheetEntryKind;
  scheduledDate: Date;
  minutes: number;
}

/**
 * Read port over the caregiver's visits for earnings. Implemented by an adapter
 * that delegates to the visits context, projecting each visit down to the minutes
 * it contributes, so the earnings context never depends on the visit domain shape.
 */
export interface CaregiverTimesheetDirectory {
  listForPeriod(caregiverId: string, from: Date, toInclusive: Date): Promise<TimesheetEntry[]>;
}

export const CAREGIVER_TIMESHEET_DIRECTORY = Symbol('CAREGIVER_TIMESHEET_DIRECTORY');
