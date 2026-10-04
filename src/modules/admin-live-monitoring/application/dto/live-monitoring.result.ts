/** The six Live Monitoring KPI cards. */
export interface LiveSummaryResult {
  activeVisits: number;
  caregiversCheckedIn: number;
  checkInDue: number;
  runningLate: number;
  attentionRequired: number;
  criticalAlerts: number;
}

/** One row of the Active Visit Summary. */
export interface LiveActiveVisitResult {
  visitId: string;
  recipientName: string;
  caregiverName: string | null;
  service: string;
  status: string;
  elapsedMinutes: number;
  elapsedLabel: string;
  progressPercent: number;
}

/** One Attention Required item. */
export interface LiveAttentionResult {
  id: string;
  kind: string;
  severity: string;
  title: string;
  description: string;
  recipientName: string | null;
  caregiverName: string | null;
  visitId: string | null;
  action: string;
}

/** One Recent Live Activity entry. */
export interface LiveActivityResult {
  type: string;
  title: string;
  description: string;
  at: string;
  timeLabel: string;
}

/** The composed Live Overview tab. */
export interface LiveOverviewResult {
  updatedAt: string;
  summary: LiveSummaryResult;
  tabCounts: { activeVisits: number; attention: number };
  activeVisits: LiveActiveVisitResult[];
  attentionRequired: LiveAttentionResult[];
  recentActivity: LiveActivityResult[];
}

/** A paginated active visit list (the Active Visits tab). */
export interface LiveVisitPageResult {
  total: number;
  page: number;
  pageSize: number;
  rows: LiveActiveVisitResult[];
}

/** One point on the Map View. */
export interface LiveMapPointResult {
  visitId: string;
  recipientName: string;
  recipientLatitude: number | null;
  recipientLongitude: number | null;
  caregiverName: string | null;
  caregiverLatitude: number | null;
  caregiverLongitude: number | null;
  status: string;
}

/** The Map View data feed. */
export interface LiveMapResult {
  visits: LiveMapPointResult[];
  sos: {
    id: string;
    caregiverName: string | null;
    latitude: number | null;
    longitude: number | null;
  }[];
}
