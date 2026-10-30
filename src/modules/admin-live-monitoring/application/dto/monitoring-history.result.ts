/** A page of results with its pagination metadata. */
export interface PagedResult<T> {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  rows: T[];
  generatedAt: string;
}

export interface CompletedVisitResult {
  id: string;
  /** Display reference, e.g. "CP-9821". */
  reference: string;
  recipientName: string;
  caregiverName: string | null;
  dateLabel: string;
  durationLabel: string;
  /** COMPLETED or COMPLETED_LATE. */
  status: string;
  statusLabel: string;
}

export interface PastAlertResult {
  id: string;
  type: string;
  /** Human label of the alert type, e.g. "Late Check-in". */
  typeLabel: string;
  severity: string;
  description: string;
  source: string;
  branch: string | null;
  /** The alert date, e.g. "12 Oct 2026". */
  dateLabel: string;
  createdAt: string;
  resolvedAt: string;
  /** How it was resolved: "Auto-resolved", "Coordinator resolved" or "Dismissed". */
  resolution: string;
  statusLabel: string;
}

export interface PastIncidentResult {
  id: string;
  reference: string;
  category: string;
  /** Human label of the category, e.g. "Medication Concern". */
  categoryLabel: string;
  severity: string;
  /** Who reported it (free text), falling back to the care recipient. */
  reporter: string;
  /** The incident date, e.g. "12 Oct 2026". */
  dateLabel: string;
  createdAt: string;
  resolvedAt: string;
  /** Resolved or Closed. */
  outcome: string;
}
