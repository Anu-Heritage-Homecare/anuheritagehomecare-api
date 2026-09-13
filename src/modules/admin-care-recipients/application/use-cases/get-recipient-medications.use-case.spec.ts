import { AdminUser } from '@modules/admin-identity/domain/admin-user.entity';
import { AdminUserRepository } from '@modules/admin-identity/domain/admin-user.repository';
import { CareRecipient } from '@modules/care-recipients/domain/care-recipient.entity';
import { CareRecipientRepository } from '@modules/care-recipients/domain/care-recipient.repository';
import { Medication } from '@modules/care-recipients/domain/medication.entity';
import { MedicationStatus } from '@modules/care-recipients/domain/medication-status.enum';
import { MedicationAudit } from '@modules/care-recipients/domain/medication-audit.entity';
import { MedicationAuditRepository } from '@modules/care-recipients/domain/medication-audit.repository';
import { MedicationWarning } from '@modules/care-recipients/domain/medication-warning.entity';
import { MedicationWarningRepository } from '@modules/care-recipients/domain/medication-warning.repository';
import { User } from '@modules/identity/domain/user.entity';
import { UserRepository } from '@modules/identity/domain/user.repository';
import { MedicationAdministrationOutcome } from '@modules/visits/domain/medication-administration-outcome.enum';
import { Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import {
  AdministrationView,
  MedicationAdherenceCount,
  MedicationAdministrationDirectory,
} from '../ports/medication-administration.port';
import { GetRecipientMedicationsUseCase } from './get-recipient-medications.use-case';

const NOW = new Date('2026-07-24T13:00:00.000Z');
const clock: Clock = { now: () => NOW };
const R = 'r1';

const m1 = Medication.create({
  id: 'm1',
  name: 'Donepezil',
  dose: '10mg',
  purpose: "Alzheimer's cognitive function",
  prescribedBy: 'Dr. Sarah Kim',
  startDate: new Date('2026-03-15T00:00:00.000Z'),
  instructions: 'with food',
  doseTimes: [480],
});
const m2 = Medication.create({
  id: 'm2',
  name: 'Metformin',
  dose: '500mg',
  startDate: new Date('2026-06-20T00:00:00.000Z'),
  doseTimes: [480, 1020],
});
const m3 = Medication.create({
  id: 'm3',
  name: 'OldMed',
  status: MedicationStatus.Discontinued,
  discontinuedAt: new Date('2026-05-01T00:00:00.000Z'),
});

function recipient(medications: Medication[]): CareRecipient {
  return { id: R, primaryCaregiverId: 'cg1', medications } as unknown as CareRecipient;
}

function recipients(value: CareRecipient | null): CareRecipientRepository {
  return {
    save: () => Promise.resolve(),
    findById: (id) => Promise.resolve(value !== null && id === R ? value : null),
    findByIds: () => Promise.resolve([]),
    listByOwner: () => Promise.resolve([]),
  };
}

function warningsRepo(items: MedicationWarning[]): MedicationWarningRepository {
  return {
    replaceForRecipient: () => Promise.resolve(),
    listForRecipient: () => Promise.resolve(items),
  };
}

function auditsRepo(items: MedicationAudit[]): MedicationAuditRepository {
  return {
    add: () => Promise.resolve(),
    listForRecipient: () => Promise.resolve(items),
  };
}

function administrations(
  perMed: Map<string, MedicationAdherenceCount>,
  current: Map<string, MedicationAdherenceCount>,
  prior: Map<string, MedicationAdherenceCount>,
  recent: AdministrationView[],
): MedicationAdministrationDirectory {
  return {
    adherenceCounts: (_id, from) => {
      // Distinguish the three windows by their start date.
      if (from.getTime() === new Date('2026-04-25T00:00:00.000Z').getTime()) {
        return Promise.resolve(perMed);
      }
      if (from.getTime() === new Date('2026-06-24T00:00:00.000Z').getTime()) {
        return Promise.resolve(current);
      }
      return Promise.resolve(prior);
    },
    recentAdministrations: () => Promise.resolve(recent),
  };
}

function users(map: Record<string, string>): UserRepository {
  return {
    save: () => Promise.resolve(),
    findById: () => Promise.resolve(null),
    findByIds: (ids) =>
      Promise.resolve(
        ids
          .filter((id) => id in map)
          .map((id) => ({ id, name: { fullName: map[id] } }) as unknown as User),
      ),
    findByEmail: () => Promise.resolve(null),
    existsByEmail: () => Promise.resolve(false),
    existsByPhone: () => Promise.resolve(false),
    countByType: () => Promise.resolve(0),
  };
}

function admins(map: Record<string, string>): AdminUserRepository {
  return {
    save: () => Promise.resolve(),
    findById: (id: string) =>
      Promise.resolve(id in map ? ({ name: { fullName: map[id] } } as unknown as AdminUser) : null),
    findByEmail: () => Promise.resolve(null),
    existsByEmail: () => Promise.resolve(false),
  } as unknown as AdminUserRepository;
}

const recent: AdministrationView[] = [
  {
    medicationId: 'm1',
    outcome: MedicationAdministrationOutcome.Administered,
    recordedAt: new Date('2026-07-24T08:05:00.000Z'),
    caregiverId: 'cg1',
    visitDate: new Date('2026-07-24T00:00:00.000Z'),
  },
  {
    medicationId: 'm2',
    outcome: MedicationAdministrationOutcome.Administered,
    recordedAt: new Date('2026-07-24T08:10:00.000Z'),
    caregiverId: 'cg1',
    visitDate: new Date('2026-07-24T00:00:00.000Z'),
  },
  {
    medicationId: 'm2',
    outcome: MedicationAdministrationOutcome.Refused,
    recordedAt: new Date('2026-07-22T17:00:00.000Z'),
    caregiverId: 'cg1',
    visitDate: new Date('2026-07-22T00:00:00.000Z'),
  },
];

function build(): GetRecipientMedicationsUseCase {
  return new GetRecipientMedicationsUseCase(
    recipients(recipient([m1, m2, m3])),
    warningsRepo([
      MedicationWarning.create({
        id: 'w1',
        careRecipientId: R,
        title: 'Donepezil + Memantine Interaction',
        detail: 'Moderate risk. Monitor closely.',
        position: 0,
      }),
    ]),
    auditsRepo([
      MedicationAudit.record({
        id: 'a1',
        careRecipientId: R,
        title: 'Memantine 10mg Added',
        detail: 'Authorized by Dr. Sarah Kim',
        authorAdminId: 'admin1',
        now: new Date('2026-07-01T00:00:00.000Z'),
      }),
    ]),
    administrations(
      new Map([
        ['m1', { administered: 48, recorded: 50 }],
        ['m2', { administered: 91, recorded: 100 }],
      ]),
      new Map([['m1', { administered: 47, recorded: 50 }]]),
      new Map([['m1', { administered: 46, recorded: 50 }]]),
      recent,
    ),
    users({ cg1: 'Sarah Williams' }),
    admins({ admin1: 'Sarah Kim' }),
    clock,
  );
}

describe('GetRecipientMedicationsUseCase', () => {
  it('rejects an unknown recipient', async () => {
    const useCase = new GetRecipientMedicationsUseCase(
      recipients(null),
      warningsRepo([]),
      auditsRepo([]),
      administrations(new Map(), new Map(), new Map(), []),
      users({}),
      admins({}),
      clock,
    );
    await expect(useCase.execute('nope')).rejects.toBeInstanceOf(NotFoundDomainException);
  });

  it('builds the summary cards: active count, adherence with trend, next dose and alerts', async () => {
    const result = await build().execute(R);
    expect(result.summary.activeMedications).toBe(2);
    expect(result.summary.adherenceRatePercent).toBe(94);
    expect(result.summary.adherenceTrendPoints).toBe(2);
    expect(result.summary.activeAlerts).toBe(1);
    expect(result.summary.alertSummary).toBe('Donepezil + Memantine Interaction');
    // Now is 1:00 PM; the next scheduled dose is Metformin at 5:00 PM (minute 1020).
    expect(result.summary.nextDose?.minute).toBe(1020);
    expect(result.summary.nextDose?.label).toBe('Metformin (500mg)');
    expect(result.summary.nextDose?.at.toISOString()).toBe('2026-07-24T17:00:00.000Z');
  });

  it('lists prescriptions newest first with per medication adherence, last administered and misses', async () => {
    const result = await build().execute(R);
    expect(result.prescriptions.map((p) => p.id)).toEqual(['m2', 'm1', 'm3']);
    const metformin = result.prescriptions.find((p) => p.id === 'm2');
    expect(metformin?.adherencePercent).toBe(91);
    expect(metformin?.scheduleLabel).toBe('Twice daily, Morning & Evening');
    expect(metformin?.lastAdministered?.caregiverName).toBe('Sarah Williams');
    expect(metformin?.alert).toBe('Missed dose Jul 22');
    const donepezil = result.prescriptions.find((p) => p.id === 'm1');
    expect(donepezil?.scheduleLabel).toBe('Once daily, Morning (with food)');
    expect(donepezil?.adherencePercent).toBe(96);
    const discontinued = result.prescriptions.find((p) => p.id === 'm3');
    expect(discontinued?.status).toBe(MedicationStatus.Discontinued);
  });

  it('snaps administrations to the nearest dose time so a later dose stays due', async () => {
    const result = await build().execute(R);
    const morning = result.todaysSchedule.find((d) => d.minute === 480);
    const evening = result.todaysSchedule.find((d) => d.minute === 1020);
    expect(morning?.administered).toBe(true);
    expect(morning?.caregiverName).toBe('Sarah Williams');
    expect(morning?.medications.map((m) => m.name).sort()).toEqual(['Donepezil', 'Metformin']);
    // The 8am Metformin was given, but its 5pm dose is still scheduled.
    expect(evening?.administered).toBe(false);
    expect(evening?.medications.map((m) => m.name)).toEqual(['Metformin']);
    expect(evening?.caregiverName).toBe('Sarah Williams');
  });

  it('resolves the audit author name', async () => {
    const result = await build().execute(R);
    expect(result.audits).toHaveLength(1);
    expect(result.audits[0].authorName).toBe('Sarah Kim');
    expect(result.audits[0].title).toBe('Memantine 10mg Added');
  });
});
