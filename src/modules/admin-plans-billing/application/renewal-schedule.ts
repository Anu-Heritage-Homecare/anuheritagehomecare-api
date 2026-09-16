/**
 * The next monthly billing date strictly after `now`, keeping the day and time of
 * day of the original start date. Subscriptions bill on a monthly cadence anchored
 * to their start date; there is no stored renewal date, so it is derived here.
 */
export function nextMonthlyRenewal(startDate: Date, now: Date): Date {
  let renewal = startDate;
  while (renewal.getTime() <= now.getTime()) {
    renewal = new Date(
      Date.UTC(
        renewal.getUTCFullYear(),
        renewal.getUTCMonth() + 1,
        startDate.getUTCDate(),
        startDate.getUTCHours(),
        startDate.getUTCMinutes(),
        startDate.getUTCSeconds(),
      ),
    );
  }
  return renewal;
}
