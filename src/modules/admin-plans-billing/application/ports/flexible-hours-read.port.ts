import { Currency as PrismaCurrency } from '@prisma/client';

/**
 * Flexible plan activity derived from confirmed bookings, in one currency. There is
 * no stored purchased hour balance, so the tracker reports booked and upcoming hours
 * rather than an inventory figure.
 */
export interface FlexibleHoursView {
  bookingsThisMonth: number;
  hoursBookedThisMonth: number;
  revenueThisMonthMinor: number;
  upcomingBookings: number;
  upcomingHours: number;
}

export interface FlexibleHoursReadModel {
  flexibleHours(currency: PrismaCurrency, now: Date): Promise<FlexibleHoursView>;
}

export const FLEXIBLE_HOURS_READ_MODEL = Symbol('FLEXIBLE_HOURS_READ_MODEL');
