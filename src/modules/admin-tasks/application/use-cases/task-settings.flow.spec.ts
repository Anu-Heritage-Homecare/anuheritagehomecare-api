import { Clock } from '@shared/application/ports/clock.port';
import {
  CategorySettingPatch,
  CategorySettingRow,
  NotificationSettingPatch,
  NotificationSettingRow,
  PrioritySettingPatch,
  PrioritySettingRow,
  TaskSettingsStore,
} from '../ports/task-settings.store';
import { GetTaskSettingsUseCase } from './get-task-settings.use-case';
import {
  UpdateCategorySettingUseCase,
  UpdateNotificationSettingUseCase,
  UpdatePrioritySettingUseCase,
} from './update-task-settings.use-case';

const NOW = new Date('2026-10-30T09:00:00.000Z');
const clock: Clock = { now: () => NOW };

interface Calls {
  categoryUpserts: Array<{ category: string; patch: CategorySettingPatch }>;
  priorityUpserts: Array<{ priority: string; patch: PrioritySettingPatch }>;
  cleared: string[];
  notificationUpserts: Array<{ key: string; patch: NotificationSettingPatch }>;
}

function store(
  seed: {
    categories?: CategorySettingRow[];
    counts?: Map<string, number>;
    priorities?: PrioritySettingRow[];
    notifications?: NotificationSettingRow[];
  } = {},
): TaskSettingsStore & { calls: Calls } {
  const calls: Calls = {
    categoryUpserts: [],
    priorityUpserts: [],
    cleared: [],
    notificationUpserts: [],
  };
  return {
    calls,
    listCategorySettings: () => Promise.resolve(seed.categories ?? []),
    categoryTaskCounts: () => Promise.resolve(seed.counts ?? new Map()),
    upsertCategorySetting: (category, patch) => {
      calls.categoryUpserts.push({ category, patch });
      return Promise.resolve();
    },
    listPrioritySettings: () => Promise.resolve(seed.priorities ?? []),
    clearPriorityDefaults: (except) => {
      calls.cleared.push(except);
      return Promise.resolve();
    },
    upsertPrioritySetting: (priority, patch) => {
      calls.priorityUpserts.push({ priority, patch });
      return Promise.resolve();
    },
    listNotificationSettings: () => Promise.resolve(seed.notifications ?? []),
    upsertNotificationSetting: (key, patch) => {
      calls.notificationUpserts.push({ key, patch });
      return Promise.resolve();
    },
  };
}

describe('GetTaskSettingsUseCase', () => {
  it('merges defaults with overrides and attaches task counts', async () => {
    const result = await new GetTaskSettingsUseCase(
      store({
        categories: [
          {
            category: 'MEDICATION',
            color: '#000000',
            icon: 'pill',
            autoAssignLabel: 'Certified Only',
            active: false,
          },
        ],
        counts: new Map([
          ['MEDICATION', 420],
          ['CARE_ACTIVITY', 280],
        ]),
        notifications: [{ key: 'OVERDUE', enabled: false, channels: ['PUSH'] }],
      }),
    ).execute();

    // Every category enum value is present.
    expect(result.categories).toHaveLength(7);
    const medication = result.categories.find((c) => c.category === 'MEDICATION');
    expect(medication).toMatchObject({
      label: 'Medication',
      color: '#000000',
      icon: 'pill',
      autoAssignLabel: 'Certified Only',
      tasksCount: 420,
      active: false,
    });
    const careActivity = result.categories.find((c) => c.category === 'CARE_ACTIVITY');
    expect(careActivity?.tasksCount).toBe(280);
    expect(careActivity?.active).toBe(true); // default when no override

    // Priorities fall back to defaults: Medium is the default, highest first.
    expect(result.priorities.map((p) => p.priority)).toEqual(['URGENT', 'HIGH', 'MEDIUM', 'LOW']);
    expect(result.priorities[0]).toMatchObject({ level: 1, label: 'Critical', slaHours: 2 });
    expect(result.priorities.find((p) => p.priority === 'MEDIUM')?.isDefault).toBe(true);

    // Notification override applied; label derived from channels.
    const overdue = result.notifications.find((n) => n.key === 'OVERDUE');
    expect(overdue).toMatchObject({ enabled: false, channels: ['PUSH'], channelsLabel: 'Push' });
    const assigned = result.notifications.find((n) => n.key === 'TASK_ASSIGNED');
    expect(assigned?.channelsLabel).toBe('Push + Email');
  });
});

describe('UpdatePrioritySettingUseCase', () => {
  it('clears other defaults when setting a new default', async () => {
    const s = store();
    await new UpdatePrioritySettingUseCase(s, clock).execute('HIGH', { isDefault: true });
    expect(s.calls.cleared).toEqual(['HIGH']);
    expect(s.calls.priorityUpserts).toEqual([{ priority: 'HIGH', patch: { isDefault: true } }]);
  });

  it('does not clear defaults for a non-default edit', async () => {
    const s = store();
    await new UpdatePrioritySettingUseCase(s, clock).execute('LOW', { slaHours: 36 });
    expect(s.calls.cleared).toEqual([]);
  });
});

describe('UpdateCategorySettingUseCase / UpdateNotificationSettingUseCase', () => {
  it('delegates the upserts', async () => {
    const s = store();
    await new UpdateCategorySettingUseCase(s, clock).execute('MEDICATION', { active: false });
    await new UpdateNotificationSettingUseCase(s, clock).execute('DAILY_SUMMARY', {
      enabled: false,
    });
    expect(s.calls.categoryUpserts).toEqual([{ category: 'MEDICATION', patch: { active: false } }]);
    expect(s.calls.notificationUpserts).toEqual([
      { key: 'DAILY_SUMMARY', patch: { enabled: false } },
    ]);
  });
});
