import { HolidayPolicy } from './holiday-policy.enum';
import { SchedulingSettings } from './scheduling-settings.entity';

/** One holiday on the scheduling calendar. */
export interface SchedulingHolidayData {
  id: string;
  name: string;
  date: Date;
  policy: HolidayPolicy;
}

/** Persistence port for the scheduling settings singleton and the holiday calendar. */
export interface SchedulingSettingsRepository {
  /** The settings singleton, or null before it is first saved. */
  find(): Promise<SchedulingSettings | null>;
  save(settings: SchedulingSettings): Promise<void>;
  listHolidays(): Promise<SchedulingHolidayData[]>;
  addHoliday(holiday: SchedulingHolidayData): Promise<void>;
  removeHoliday(id: string): Promise<void>;
}

export const SCHEDULING_SETTINGS_REPOSITORY = Symbol('SCHEDULING_SETTINGS_REPOSITORY');
