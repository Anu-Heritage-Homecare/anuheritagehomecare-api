import { MoneyResult } from './recipient-billing.result';

export interface ArchiveServiceSummaryResult {
  status: string;
  careDurationMonths: number;
  /** A human label for the care duration, for example "1 yr, 7 month". */
  careDurationLabel: string;
  totalVisitsCompleted: number;
  activePlan: boolean;
  planLevel: string | null;
  outstandingBalance: MoneyResult | null;
  assignedCaregivers: number;
}

export interface DischargeChecklistItemResult {
  key: string;
  label: string;
  detail: string;
  /** DONE, PENDING or NOT_STARTED, derived from the recipient's real state. */
  status: string;
}

export interface DischargeDraftResult {
  action: string;
  reason: string | null;
  effectiveDate: Date | null;
  clinicalSummary: string | null;
  acknowledgements: string[];
  status: string;
  processedAt: Date | null;
}

export interface RecipientArchiveResult {
  summary: ArchiveServiceSummaryResult;
  checklist: DischargeChecklistItemResult[];
  /** The saved discharge draft (or processed record), or null when none exists yet. */
  draft: DischargeDraftResult | null;
}
