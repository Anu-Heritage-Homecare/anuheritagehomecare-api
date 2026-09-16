/** One row of the New Care Requests table. */
export interface CareRequestRowResult {
  id: string;
  familyName: string | null;
  patientName: string | null;
  careType: string;
  requestedDate: string;
  startMinute: number;
  durationMinutes: number;
  reason: string | null;
  status: string;
  createdAt: string;
}

export interface CareRequestListResult {
  total: number;
  page: number;
  pageSize: number;
  rows: CareRequestRowResult[];
}
