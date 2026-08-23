/** The caregiver earnings dashboard for the current pay period. */
export interface EarningsSummaryResult {
  currency: string;
  payPeriod: {
    start: string;
    end: string;
    payDay: string;
    totalDays: number;
    elapsedDays: number;
    daysUntilPayday: number;
    progressPercent: number;
  };
  hours: {
    approved: number;
    pending: number;
  };
  // Net pay from approved hours so far, and the projection if every pending hour
  // is later approved.
  estimatedPayMinor: number;
  estimatedEarningsMinor: number;
  breakdown: {
    regularHours: number;
    regularPayMinor: number;
    overtimeHours: number;
    overtimePayMinor: number;
    weekendVisits: number;
    weekendBonusMinor: number;
    grossMinor: number;
    deductionsMinor: number;
    netMinor: number;
  };
}
