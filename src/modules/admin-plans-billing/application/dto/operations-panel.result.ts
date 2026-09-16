/** The Flexible Hours Asset Tracker figures for one currency. */
export interface FlexibleHoursResult {
  currency: string;
  bookingsThisMonth: number;
  hoursBookedThisMonth: number;
  revenueThisMonthMinor: number;
  upcomingBookings: number;
  upcomingHours: number;
  /**
   * A purchased hour balance is not modelled (bookings are paid per session), so
   * this reads as null rather than an invented inventory figure.
   */
  remainingBalanceHours: number | null;
}

/** One button in the Immediate Command Actions bar and whether it is wired. */
export interface CommandActionResult {
  key: string;
  label: string;
  available: boolean;
  /** Why the action is unavailable, when it is deferred. */
  reason: string | null;
}

export interface OperationsPanelResult {
  flexibleHours: FlexibleHoursResult;
  commandActions: CommandActionResult[];
}
