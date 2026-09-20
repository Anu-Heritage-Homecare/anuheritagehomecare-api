/** One visit card in a day of the weekly calendar. */
export interface CaregiverScheduleDayVisitResult {
  time: string;
  endTime: string;
  recipientName: string;
  visitType: string;
  status: string;
}

/** One day column of the weekly calendar. */
export interface CaregiverScheduleDayResult {
  dayLabel: string;
  date: string;
  offDuty: boolean;
  visits: CaregiverScheduleDayVisitResult[];
}

/** One row of the Upcoming Visits table. */
export interface CaregiverScheduleVisitResult {
  date: string;
  time: string;
  recipientName: string;
  visitType: string;
  durationHours: number;
  status: string;
}

/** One day of the Availability Settings panel. */
export interface CaregiverAvailabilitySettingDayResult {
  dayLabel: string;
  available: boolean;
  window: string | null;
}

/** The composed caregiver Schedule tab. */
export interface CaregiverScheduleResult {
  weekStart: string;
  weekEnd: string;
  summary: {
    hoursScheduled: number;
    targetHours: number | null;
    loadPercent: number | null;
    visitsScheduled: number;
    allConfirmed: boolean;
    availabilityDayRange: string | null;
    standardWindow: string | null;
  };
  days: CaregiverScheduleDayResult[];
  upcomingVisits: CaregiverScheduleVisitResult[];
  availabilitySettings: {
    days: CaregiverAvailabilitySettingDayResult[];
    maxHoursPerWeek: number | null;
    preferredShift: string | null;
    overtimeEligible: boolean;
    overtimeRate: number | null;
  };
}
