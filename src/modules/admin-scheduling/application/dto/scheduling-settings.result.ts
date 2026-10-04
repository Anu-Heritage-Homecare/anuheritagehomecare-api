/** One weekday's business hours. */
export interface BusinessHourDayResult {
  weekday: string;
  weekdayLabel: string;
  open: boolean;
  openMinute: number;
  closeMinute: number;
  openLabel: string;
  closeLabel: string;
}

/** One service type's default visit duration. */
export interface DefaultDurationResult {
  visitType: string;
  label: string;
  minutes: number;
}

/** The scheduling rule toggles. */
export interface SchedulingRulesResult {
  requireCertificationMatch: boolean;
  autoAssignPreferredCaregiver: boolean;
  allowOvertimeScheduling: boolean;
  requireCoordinatorApprovalForUrgent: boolean;
  sendRemindersOneHourBefore: boolean;
  autoCancelUnconfirmedAfter24h: boolean;
}

/** The travel and buffer settings. */
export interface TravelSettingsResult {
  minBufferMinutes: number;
  travelTimeEstimation: boolean;
  maxTravelDistanceMiles: number;
  allowBackToBackVisits: boolean;
}

/** One holiday on the calendar. */
export interface HolidayResult {
  id: string;
  name: string;
  date: string;
  policy: string;
  policyLabel: string;
}

/** The composed Schedule Settings screen. */
export interface SchedulingSettingsResult {
  businessHours: BusinessHourDayResult[];
  defaultDurations: DefaultDurationResult[];
  rules: SchedulingRulesResult;
  travel: TravelSettingsResult;
  holidays: HolidayResult[];
}
