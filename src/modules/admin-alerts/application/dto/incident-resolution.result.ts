export interface IncidentResolutionResult {
  id: string;
  reference: string;
  status: string;
  statusLabel: string;
  summary: string | null;
  actionsTaken: string | null;
  followUpRequired: boolean;
  /** ISO date (date only) of the follow up, or null. */
  followUpDate: string | null;
  /** "Jul 19 2026" or null. */
  followUpDateLabel: string | null;
  followUpNotes: string | null;
  /** The resolver's name, or null while pending. */
  resolvedBy: string | null;
  /** Time from raised to resolved, e.g. "58m", or null while pending. */
  resolutionTimeLabel: string | null;
  resolved: boolean;
  generatedAt: string;
}
