const DAY_MS = 24 * 60 * 60 * 1000;

export function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addMonths(date: Date, months: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, date.getUTCDate()));
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

/**
 * The next monthly anniversary of `start` strictly after `reference`. Used to
 * derive the next payment date, since the provider owns the real recurring
 * schedule and we only display when the next charge falls.
 */
export function nextMonthlyDate(start: Date, reference: Date): Date {
  const next = startOfUtcDay(start);
  const ref = startOfUtcDay(reference);
  while (next.getTime() <= ref.getTime()) {
    next.setUTCMonth(next.getUTCMonth() + 1);
  }
  return next;
}

/** The monthly period anchored on `start` that contains `reference`. */
export function monthlyPeriodContaining(
  start: Date,
  reference: Date,
): { periodStart: Date; periodEnd: Date } {
  let periodStart = startOfUtcDay(start);
  const ref = startOfUtcDay(reference);
  while (addMonths(periodStart, 1).getTime() <= ref.getTime()) {
    periodStart = addMonths(periodStart, 1);
  }
  const periodEnd = addDays(addMonths(periodStart, 1), -1);
  return { periodStart, periodEnd };
}

export function isSameUtcMonth(a: Date, b: Date): boolean {
  return a.getUTCFullYear() === b.getUTCFullYear() && a.getUTCMonth() === b.getUTCMonth();
}
