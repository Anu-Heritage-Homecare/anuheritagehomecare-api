import { Visit } from '@modules/visits/domain/visit.entity';

const ACTIVE = new Set(['IN_PROGRESS', 'ON_BREAK']);

/**
 * Pick the most relevant visit from a day's visits: an active one first, then a
 * scheduled one, then the earliest by start time. Returns null for no visits.
 */
export function pickCurrentVisit(visits: Visit[]): Visit | null {
  if (visits.length === 0) {
    return null;
  }
  const priority = (visit: Visit): number => {
    const status = String(visit.status);
    if (ACTIVE.has(status)) {
      return 3;
    }
    return status === 'SCHEDULED' ? 2 : 1;
  };
  return [...visits].sort((a, b) => {
    const byPriority = priority(b) - priority(a);
    return byPriority !== 0 ? byPriority : a.window.startMinute - b.window.startMinute;
  })[0];
}
