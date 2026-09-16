/** One row of the Recent Care Requests verification queue. */
export interface ApplicationRowResult {
  id: string;
  familyName: string;
  patientName: string;
  selectedPlanType: string | null;
  planName: string | null;
  monthlyPriceMinor: number | null;
  currency: string;
  paymentStatus: string;
  coordinatorName: string | null;
  status: string;
  submittedAt: string;
}

export interface ApplicationListResult {
  currency: string;
  total: number;
  page: number;
  pageSize: number;
  rows: ApplicationRowResult[];
}
