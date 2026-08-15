export interface AvailabilitySlotResult {
  startTime: string;
  available: boolean;
}

export interface AvailabilityResult {
  date: string;
  slots: AvailabilitySlotResult[];
}
