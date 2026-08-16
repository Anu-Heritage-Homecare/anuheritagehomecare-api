/** Midnight (UTC) of the day the given instant falls on. */
export function startOfUtcDay(value: Date): Date {
  return new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate(), 0, 0, 0, 0),
  );
}

/** Render a date as an ISO calendar day (YYYY-MM-DD) in UTC. */
export function toIsoDate(value: Date): string {
  return startOfUtcDay(value).toISOString().slice(0, 10);
}
