/** One visit row for the scheduling console, already hydrated with names. */
export interface SchedulingVisitRow {
  id: string;
  scheduledDate: Date;
  startMinute: number;
  endMinute: number;
  visitType: string;
  priority: string;
  status: string;
  caregiverId: string | null;
  recipientName: string;
  caregiverName: string | null;
}

/** All of a day's visits plus the count of caregivers available for dispatch. */
export interface SchedulingDayView {
  visits: SchedulingVisitRow[];
  activeCaregivers: number;
}

/**
 * Read model for the admin Scheduling console. Reads the org's visits for a day or a
 * range and hydrates the recipient and caregiver names in one batched pass, so the
 * use cases can derive the KPIs, the table, the conflicts and the calendar without
 * an N plus 1.
 */
export interface SchedulingReadModel {
  /** Every visit scheduled on the day [dayStart, nextDay), with the active caregiver count. */
  day(dayStart: Date, nextDay: Date): Promise<SchedulingDayView>;
  /** Every visit scheduled within [from, to), for the calendar. */
  range(from: Date, to: Date): Promise<SchedulingVisitRow[]>;
}

export const SCHEDULING_READ_MODEL = Symbol('SCHEDULING_READ_MODEL');
