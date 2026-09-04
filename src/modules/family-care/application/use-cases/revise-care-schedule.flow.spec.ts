import { Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { CareRecipient } from '@modules/care-recipients/domain/care-recipient.entity';
import { CareRecipientRepository } from '@modules/care-recipients/domain/care-recipient.repository';
import { CareSchedule } from '@modules/care-recipients/domain/value-objects/care-schedule.vo';
import { Weekday } from '@modules/care-recipients/domain/weekday.enum';
import { ReviseCareScheduleUseCase } from './revise-care-schedule.use-case';

const NOW = new Date('2026-09-04T00:00:00.000Z');
const clock: Clock = { now: () => NOW };

interface FakeRecipient {
  ownerId: string;
  revised: CareSchedule | null;
  reviseSchedule: (schedule: CareSchedule, now: Date) => void;
}

function fakeRecipient(ownerId: string): FakeRecipient {
  const recipient: FakeRecipient = {
    ownerId,
    revised: null,
    reviseSchedule(schedule) {
      recipient.revised = schedule;
    },
  };
  return recipient;
}

function repository(recipient: FakeRecipient | null): {
  repo: CareRecipientRepository;
  saved: CareRecipient[];
} {
  const saved: CareRecipient[] = [];
  const repo = {
    findById: () => Promise.resolve(recipient as unknown as CareRecipient | null),
    save: (r: CareRecipient) => {
      saved.push(r);
      return Promise.resolve();
    },
  } as unknown as CareRecipientRepository;
  return { repo, saved };
}

const command = {
  ownerId: 'owner-1',
  careRecipientId: 'r1',
  frequency: 'WEEKLY',
  estimatedStartDate: '2026-08-20',
  expectedDuration: '3 months',
  days: ['MONDAY', 'WEDNESDAY', 'FRIDAY'],
  startMinute: 540,
  visitDurationMinutes: 180,
};

describe('ReviseCareScheduleUseCase', () => {
  it('revises the schedule for the owner and saves', async () => {
    const recipient = fakeRecipient('owner-1');
    const { repo, saved } = repository(recipient);

    await new ReviseCareScheduleUseCase(repo, clock).execute(command);

    expect(recipient.revised).not.toBeNull();
    expect(recipient.revised?.days).toEqual([Weekday.Monday, Weekday.Wednesday, Weekday.Friday]);
    expect(recipient.revised?.startMinute).toBe(540);
    expect(saved).toHaveLength(1);
  });

  it('404s a recipient the owner does not own', async () => {
    const { repo } = repository(fakeRecipient('someone-else'));

    await expect(
      new ReviseCareScheduleUseCase(repo, clock).execute(command),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });

  it('404s a missing recipient', async () => {
    const { repo } = repository(null);

    await expect(
      new ReviseCareScheduleUseCase(repo, clock).execute(command),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});
