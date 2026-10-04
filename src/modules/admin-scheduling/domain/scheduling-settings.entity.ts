import { Weekday } from '@modules/care-recipients/domain/weekday.enum';
import { AggregateRoot } from '@shared/domain/aggregate-root.base';
import { ValidationException } from '@shared/domain/domain-exception';

const MINUTES_IN_DAY = 1440;

/** The hours a given weekday is open for scheduling. */
export interface BusinessHourDay {
  weekday: Weekday;
  open: boolean;
  openMinute: number;
  closeMinute: number;
}

/** The automatic scheduling rules. */
export interface SchedulingRules {
  requireCertificationMatch: boolean;
  autoAssignPreferredCaregiver: boolean;
  allowOvertimeScheduling: boolean;
  requireCoordinatorApprovalForUrgent: boolean;
  sendRemindersOneHourBefore: boolean;
  autoCancelUnconfirmedAfter24h: boolean;
}

/** The travel and buffer settings between consecutive visits. */
export interface TravelSettings {
  minBufferMinutes: number;
  travelTimeEstimation: boolean;
  maxTravelDistanceMiles: number;
  allowBackToBackVisits: boolean;
}

interface SchedulingSettingsProps {
  businessHours: BusinessHourDay[];
  /** Default visit duration in minutes, keyed by VisitType value. */
  defaultDurations: Record<string, number>;
  rules: SchedulingRules;
  travel: TravelSettings;
  updatedAt: Date;
}

const WEEKDAY_ORDER: Weekday[] = [
  Weekday.Monday,
  Weekday.Tuesday,
  Weekday.Wednesday,
  Weekday.Thursday,
  Weekday.Friday,
  Weekday.Saturday,
  Weekday.Sunday,
];

/**
 * The org wide scheduling configuration (the Schedule Settings screen): business
 * hours, default visit durations, the automatic rules and the travel and buffer
 * settings. A singleton, so it is keyed to a fixed id. Holidays are modelled as a
 * separate collection.
 */
export class SchedulingSettings extends AggregateRoot<string> {
  public static readonly SINGLETON_ID = 'scheduling-settings';

  private props: SchedulingSettingsProps;

  private constructor(id: string, props: SchedulingSettingsProps) {
    super(id);
    this.props = props;
  }

  /** The sensible defaults applied before any admin saves the settings. */
  public static createDefault(now: Date): SchedulingSettings {
    const businessHours = WEEKDAY_ORDER.map((weekday) => {
      const weekend = weekday === Weekday.Saturday || weekday === Weekday.Sunday;
      return {
        weekday,
        open: weekday !== Weekday.Sunday,
        openMinute: weekend ? 8 * 60 : 7 * 60,
        closeMinute: weekend ? 16 * 60 : 20 * 60,
      };
    });
    return new SchedulingSettings(SchedulingSettings.SINGLETON_ID, {
      businessHours,
      defaultDurations: {},
      rules: {
        requireCertificationMatch: true,
        autoAssignPreferredCaregiver: true,
        allowOvertimeScheduling: false,
        requireCoordinatorApprovalForUrgent: true,
        sendRemindersOneHourBefore: true,
        autoCancelUnconfirmedAfter24h: false,
      },
      travel: {
        minBufferMinutes: 30,
        travelTimeEstimation: true,
        maxTravelDistanceMiles: 25,
        allowBackToBackVisits: false,
      },
      updatedAt: now,
    });
  }

  public static rehydrate(id: string, props: SchedulingSettingsProps): SchedulingSettings {
    return new SchedulingSettings(id, props);
  }

  /** Replace whichever settings sections are supplied; omitted sections are kept. */
  public update(
    sections: {
      businessHours?: BusinessHourDay[];
      defaultDurations?: Record<string, number>;
      rules?: SchedulingRules;
      travel?: TravelSettings;
    },
    now: Date,
  ): void {
    if (sections.businessHours !== undefined) {
      this.props.businessHours = assertBusinessHours(sections.businessHours);
    }
    if (sections.defaultDurations !== undefined) {
      this.props.defaultDurations = assertDurations(sections.defaultDurations);
    }
    if (sections.rules !== undefined) {
      this.props.rules = sections.rules;
    }
    if (sections.travel !== undefined) {
      this.props.travel = assertTravel(sections.travel);
    }
    this.props.updatedAt = now;
  }

  /** The default duration for a service type, or a fallback when none is set. */
  public defaultDurationMinutes(visitType: string, fallback: number): number {
    const value = this.props.defaultDurations[visitType];
    return value === undefined ? fallback : value;
  }

  /** The business hours for the weekday a date falls on, if configured. */
  public businessHoursFor(weekday: Weekday): BusinessHourDay | undefined {
    return this.props.businessHours.find((d) => d.weekday === weekday);
  }

  public get businessHours(): BusinessHourDay[] {
    return [...this.props.businessHours];
  }

  public get defaultDurations(): Record<string, number> {
    return { ...this.props.defaultDurations };
  }

  public get rules(): SchedulingRules {
    return { ...this.props.rules };
  }

  public get travel(): TravelSettings {
    return { ...this.props.travel };
  }

  public get updatedAt(): Date {
    return this.props.updatedAt;
  }
}

function assertMinute(value: number, label: string): number {
  if (!Number.isInteger(value) || value < 0 || value > MINUTES_IN_DAY) {
    throw new ValidationException(`${label} must be between 0 and ${MINUTES_IN_DAY} minutes`);
  }
  return value;
}

function assertBusinessHours(days: BusinessHourDay[]): BusinessHourDay[] {
  return days.map((day) => {
    const openMinute = assertMinute(day.openMinute, 'Opening time');
    const closeMinute = assertMinute(day.closeMinute, 'Closing time');
    if (day.open && closeMinute <= openMinute) {
      throw new ValidationException('Closing time must be after opening time');
    }
    return { weekday: day.weekday, open: day.open, openMinute, closeMinute };
  });
}

function assertDurations(durations: Record<string, number>): Record<string, number> {
  const clean: Record<string, number> = {};
  for (const [key, value] of Object.entries(durations)) {
    if (!Number.isInteger(value) || value <= 0 || value > MINUTES_IN_DAY) {
      throw new ValidationException(`The default duration for ${key} is out of range`);
    }
    clean[key] = value;
  }
  return clean;
}

function assertTravel(travel: TravelSettings): TravelSettings {
  if (!Number.isInteger(travel.minBufferMinutes) || travel.minBufferMinutes < 0) {
    throw new ValidationException('The minimum buffer is out of range');
  }
  if (!Number.isInteger(travel.maxTravelDistanceMiles) || travel.maxTravelDistanceMiles < 0) {
    throw new ValidationException('The maximum travel distance is out of range');
  }
  return travel;
}
