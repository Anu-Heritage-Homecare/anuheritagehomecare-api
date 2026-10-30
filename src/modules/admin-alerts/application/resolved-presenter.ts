const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

/** Compact resolution time from raised to resolved, e.g. "45m", "1h", "1h 30m". */
export function compactDuration(fromMs: number): string {
  const total = Math.max(0, fromMs);
  const hours = Math.floor(total / HOUR_MS);
  const minutes = Math.floor((total % HOUR_MS) / MINUTE_MS);
  if (hours === 0) {
    return `${minutes}m`;
  }
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
}

/** "N ago" label for a resolution timestamp. */
export function ageLabel(fromMs: number): string {
  if (fromMs < HOUR_MS) {
    return `${Math.max(1, Math.floor(fromMs / MINUTE_MS))}m ago`;
  }
  if (fromMs < DAY_MS) {
    return `${Math.floor(fromMs / HOUR_MS)}h ago`;
  }
  return `${Math.floor(fromMs / DAY_MS)}d ago`;
}

/** Average resolution label from a set of durations in ms, e.g. "24 mins" (null if empty). */
export function averageResolutionLabel(durationsMs: number[]): string | null {
  if (durationsMs.length === 0) {
    return null;
  }
  const avg = durationsMs.reduce((sum, d) => sum + Math.max(0, d), 0) / durationsMs.length;
  const minutes = Math.round(avg / MINUTE_MS);
  if (minutes < 60) {
    return `${minutes} ${minutes === 1 ? 'min' : 'mins'}`;
  }
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem === 0 ? `${hours} ${hours === 1 ? 'hr' : 'hrs'}` : `${hours}h ${rem}m`;
}
