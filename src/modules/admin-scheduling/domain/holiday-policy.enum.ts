/** How visits are handled on a holiday. */
export enum HolidayPolicy {
  Closed = 'CLOSED',
  EmergencyOnly = 'EMERGENCY_ONLY',
  Open = 'OPEN',
}

export const ALL_HOLIDAY_POLICIES: HolidayPolicy[] = Object.values(HolidayPolicy);
