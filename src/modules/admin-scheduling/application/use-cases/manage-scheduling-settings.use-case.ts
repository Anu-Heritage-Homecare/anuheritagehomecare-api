import { Inject, Injectable } from '@nestjs/common';
import { Weekday } from '@modules/care-recipients/domain/weekday.enum';
import { VisitType } from '@modules/visits/domain/visit-type.enum';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import { HolidayPolicy } from '../../domain/holiday-policy.enum';
import {
  BusinessHourDay,
  SchedulingRules,
  SchedulingSettings,
  TravelSettings,
} from '../../domain/scheduling-settings.entity';
import {
  SCHEDULING_SETTINGS_REPOSITORY,
  SchedulingHolidayData,
  SchedulingSettingsRepository,
} from '../../domain/scheduling-settings.repository';
import { SchedulingSettingsResult } from '../dto/scheduling-settings.result';
import { fallbackDurationMinutes } from '../scheduling-rules.util';
import { displayService, formatMinute } from '../scheduling-view.util';

const WEEKDAY_LABELS: Record<Weekday, string> = {
  [Weekday.Monday]: 'Monday',
  [Weekday.Tuesday]: 'Tuesday',
  [Weekday.Wednesday]: 'Wednesday',
  [Weekday.Thursday]: 'Thursday',
  [Weekday.Friday]: 'Friday',
  [Weekday.Saturday]: 'Saturday',
  [Weekday.Sunday]: 'Sunday',
};
const POLICY_LABELS: Record<string, string> = {
  CLOSED: 'Closed',
  EMERGENCY_ONLY: 'Emergency only',
  OPEN: 'Open',
};

/** Read the Schedule Settings screen, defaulting before anything is saved. */
@Injectable()
export class GetSchedulingSettingsUseCase {
  constructor(
    @Inject(SCHEDULING_SETTINGS_REPOSITORY)
    private readonly repo: SchedulingSettingsRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(): Promise<SchedulingSettingsResult> {
    const settings = (await this.repo.find()) ?? SchedulingSettings.createDefault(this.clock.now());
    const holidays = await this.repo.listHolidays();
    return toResult(settings, holidays);
  }
}

export interface UpdateSchedulingSettingsCommand {
  businessHours?: BusinessHourDay[];
  defaultDurations?: Record<string, number>;
  rules?: SchedulingRules;
  travel?: TravelSettings;
}

/** Save the Schedule Settings sections. */
@Injectable()
export class UpdateSchedulingSettingsUseCase {
  constructor(
    @Inject(SCHEDULING_SETTINGS_REPOSITORY)
    private readonly repo: SchedulingSettingsRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: UpdateSchedulingSettingsCommand): Promise<void> {
    const now = this.clock.now();
    const settings = (await this.repo.find()) ?? SchedulingSettings.createDefault(now);
    settings.update(command, now);
    await this.repo.save(settings);
  }
}

/** Add a holiday to the calendar. */
@Injectable()
export class AddHolidayUseCase {
  constructor(
    @Inject(SCHEDULING_SETTINGS_REPOSITORY)
    private readonly repo: SchedulingSettingsRepository,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
  ) {}

  async execute(command: {
    name: string;
    date: Date;
    policy: HolidayPolicy;
  }): Promise<{ id: string }> {
    const id = this.ids.generate();
    await this.repo.addHoliday({
      id,
      name: command.name.trim(),
      date: command.date,
      policy: command.policy,
    });
    return { id };
  }
}

/** Remove a holiday from the calendar. */
@Injectable()
export class RemoveHolidayUseCase {
  constructor(
    @Inject(SCHEDULING_SETTINGS_REPOSITORY)
    private readonly repo: SchedulingSettingsRepository,
  ) {}

  async execute(id: string): Promise<void> {
    await this.repo.removeHoliday(id);
  }
}

function toResult(
  settings: SchedulingSettings,
  holidays: SchedulingHolidayData[],
): SchedulingSettingsResult {
  return {
    businessHours: settings.businessHours.map((day) => ({
      weekday: String(day.weekday),
      weekdayLabel: WEEKDAY_LABELS[day.weekday],
      open: day.open,
      openMinute: day.openMinute,
      closeMinute: day.closeMinute,
      openLabel: formatMinute(day.openMinute),
      closeLabel: formatMinute(day.closeMinute),
    })),
    defaultDurations: Object.values(VisitType).map((type) => ({
      visitType: String(type),
      label: displayService(String(type)),
      minutes: settings.defaultDurationMinutes(String(type), fallbackDurationMinutes(String(type))),
    })),
    rules: settings.rules,
    travel: settings.travel,
    holidays: holidays.map((h) => ({
      id: h.id,
      name: h.name,
      date: h.date.toISOString(),
      policy: String(h.policy),
      policyLabel: POLICY_LABELS[String(h.policy)] ?? String(h.policy),
    })),
  };
}
