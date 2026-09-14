export interface ActivityItemResult {
  id: string;
  occurredAt: Date;
  category: string;
  type: string;
  title: string;
  description: string;
  performedByName: string | null;
  performedByRole: string | null;
}

export interface ActivityPageResult {
  items: ActivityItemResult[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface RecipientActivityResult {
  /** How many days back the window covers (the Date Range control). */
  windowDays: number;
  /** Distinct performer names in the window, for the User filter dropdown. */
  users: string[];
  page: ActivityPageResult;
}
