export interface IncidentTimelineEntryResult {
  at: string;
  /** Clock label, e.g. "4:32 PM". */
  timeLabel: string;
  /** Relative day, e.g. "Today", "Yesterday" or "Jul 18 2026". */
  dayLabel: string;
  title: string;
  description: string;
  /** The actor and role, e.g. "Amina Bello (Caregiver)", or null if system. */
  actor: string | null;
  kind: string;
}

export interface IncidentTimelineResult {
  id: string;
  reference: string;
  entries: IncidentTimelineEntryResult[];
  generatedAt: string;
}
