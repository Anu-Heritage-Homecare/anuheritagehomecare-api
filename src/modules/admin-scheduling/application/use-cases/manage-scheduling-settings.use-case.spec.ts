import { SchedulingSettings } from '../../domain/scheduling-settings.entity';
import { HolidayPolicy } from '../../domain/holiday-policy.enum';
import {
  SchedulingHolidayData,
  SchedulingSettingsRepository,
} from '../../domain/scheduling-settings.repository';
import {
  AddHolidayUseCase,
  GetSchedulingSettingsUseCase,
  RemoveHolidayUseCase,
  UpdateSchedulingSettingsUseCase,
} from './manage-scheduling-settings.use-case';

const NOW = new Date('2026-07-24T10:00:00.000Z');
const clock = { now: () => NOW };
const ids = { generate: () => 'holiday-new' };

function repo(): SchedulingSettingsRepository & { holidays: SchedulingHolidayData[] } {
  let settings: SchedulingSettings | null = null;
  const holidays: SchedulingHolidayData[] = [];
  return {
    holidays,
    find: () => Promise.resolve(settings),
    save: (s) => {
      settings = s;
      return Promise.resolve();
    },
    listHolidays: () => Promise.resolve(holidays),
    addHoliday: (h) => {
      holidays.push(h);
      return Promise.resolve();
    },
    removeHoliday: (id) => {
      const i = holidays.findIndex((h) => h.id === id);
      if (i >= 0) {
        holidays.splice(i, 1);
      }
      return Promise.resolve();
    },
  };
}

describe('scheduling settings use cases', () => {
  it('returns defaults for all six service types before anything is saved', async () => {
    const result = await new GetSchedulingSettingsUseCase(repo(), clock).execute();
    expect(result.businessHours).toHaveLength(7);
    expect(result.defaultDurations).toHaveLength(6);
    expect(result.holidays).toEqual([]);
    expect(result.travel.minBufferMinutes).toBe(30);
  });

  it('saves sections and reflects them on read', async () => {
    const store = repo();
    await new UpdateSchedulingSettingsUseCase(store, clock).execute({
      defaultDurations: { WOUND_CARE: 90 },
      travel: {
        minBufferMinutes: 45,
        travelTimeEstimation: false,
        maxTravelDistanceMiles: 10,
        allowBackToBackVisits: true,
      },
    });
    const result = await new GetSchedulingSettingsUseCase(store, clock).execute();
    expect(result.travel.minBufferMinutes).toBe(45);
    expect(result.defaultDurations.find((d) => d.visitType === 'WOUND_CARE')?.minutes).toBe(90);
  });

  it('adds and removes holidays', async () => {
    const store = repo();
    const added = await new AddHolidayUseCase(store, ids).execute({
      name: 'Thanksgiving Day',
      date: new Date(Date.UTC(2026, 10, 28)),
      policy: HolidayPolicy.Closed,
    });
    expect(added.id).toBe('holiday-new');
    expect(store.holidays).toHaveLength(1);

    await new RemoveHolidayUseCase(store).execute('holiday-new');
    expect(store.holidays).toHaveLength(0);
  });
});
