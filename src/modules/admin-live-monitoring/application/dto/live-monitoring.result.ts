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

/** One Attention Required item (an active SOS alert or an open operational alert). */
export interface LiveAttentionResult {
  id: string;
  source: string;
  issueType: string;
  description: string;
  priority: string;
  timeLabel: string;
  recipientName: string | null;
  caregiverName: string | null;
  visitId: string | null;
  primaryAction: string;
  secondaryAction: string;
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

/** One row in the Active Visits tab table. */
export interface LiveActiveVisitRowResult {
  /** VIS-<country>-<year>-<sequence>. */
  reference: string;
  visitId: string;
  recipientName: string;
  caregiverName: string | null;
  service: string;
  /** The clock-in time ("08:05 AM"), or null when the caregiver has not checked in. */
  checkInTimeLabel: string | null;
  status: string;
}

/**
 * The Active Visits pill counts (derived rules): Checked In is the parent of
 * In Progress + Overdue, so the pills overlap and do not sum to All Active.
 */
export interface LiveActiveVisitCountsResult {
  allActive: number;
  checkedIn: number;
  inProgress: number;
  runningLate: number;
  overdue: number;
  attention: number;
}

/** A paginated active visit list (the Active Visits tab). */
export interface LiveVisitPageResult {
  total: number;
  page: number;
  pageSize: number;
  counts: LiveActiveVisitCountsResult;
  rows: LiveActiveVisitRowResult[];
}

/** One point on the Map View, with the Selected Active Visit detail for the side panel. */
export interface LiveMapPointResult {
  visitId: string;
  /** VIS-<country>-<year>-<sequence>, shown as the Visit Code in the panel. */
  reference: string;
  /** The map dot colour: a clocked-in visit, or a scheduled visit running late. */
  category: 'ACTIVE' | 'RUNNING_LATE';
  recipientName: string;
  recipientLatitude: number | null;
  recipientLongitude: number | null;
  caregiverName: string | null;
  caregiverLatitude: number | null;
  caregiverLongitude: number | null;
  status: string;
  // Selected Active Visit panel; the detail fields are populated for ACTIVE visits.
  recipientAddress: string | null;
  caregiverTitle: string | null;
  serviceScheduled: string;
  checkInTimeLabel: string | null;
  /** The caregiver's last location ping time ("4:30 PM"), or null when none. */
  lastPingLabel: string | null;
  /** Whether that last ping is recent enough to count the caregiver as actively tracked. */
  lastPingActive: boolean;
}

/** The Map View legend counts. */
export interface LiveMapCountsResult {
  active: number;
  runningLate: number;
  sos: number;
}

/** The Map View data feed. */
export interface LiveMapResult {
  counts: LiveMapCountsResult;
  visits: LiveMapPointResult[];
  sos: {
    id: string;
    caregiverName: string | null;
    latitude: number | null;
    longitude: number | null;
  }[];
}
