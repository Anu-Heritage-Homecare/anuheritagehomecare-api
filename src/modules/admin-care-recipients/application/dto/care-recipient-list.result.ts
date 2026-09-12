/** One row of the admin Care Recipients table, fully enriched. */
export interface CareRecipientListItem {
  id: string;
  /** Human display code, for example CR-001. */
  code: string;
  name: string;
  photoKey: string | null;
  age: number;
  primaryCondition: string | null;
  careLevel: string | null;
  assignedCaregiverName: string | null;
  /** Display status: NEW when active and recently added, otherwise the stored status. */
  status: string;
  priority: string;
  lastVisitAt: Date | null;
}

export interface CareRecipientSummary {
  total: number;
  active: number;
  onHold: number;
  discharged: number;
  newThisMonth: number;
  /** Active as a whole percent of the total, 0 to 100. */
  activePercent: number;
}

export interface CareRecipientTabCounts {
  all: number;
  active: number;
  onHold: number;
  highPriority: number;
  newlyAdded: number;
}

export interface CareRecipientActionTriggers {
  needsAttention: number;
  missingCarePlan: number;
  overdueVisit: number;
}

export interface CareRecipientListResult {
  summary: CareRecipientSummary;
  tabs: CareRecipientTabCounts;
  actionTriggers: CareRecipientActionTriggers;
  items: CareRecipientListItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
