import { Clock } from '@shared/application/ports/clock.port';
import { IdGenerator } from '@shared/application/ports/id-generator.port';
import { Currency } from '@shared/domain/currency.enum';
import { NotFoundDomainException, ValidationException } from '@shared/domain/domain-exception';
import { AutoAssignAlgorithm } from '../../domain/auto-assign-algorithm.enum';
import { RateUnit } from '../../domain/rate-unit.enum';
import { ServiceOffering } from '../../domain/service-offering.entity';
import { ServiceOfferingRepository } from '../../domain/service-offering.repository';
import { VisitFormat } from '../../domain/visit-format.entity';
import { VisitFormatRepository } from '../../domain/visit-format.repository';
import { SchedulingGuardrails } from '../../domain/scheduling-guardrails.entity';
import { SchedulingGuardrailsRepository } from '../../domain/scheduling-guardrails.repository';
import { TaskChecklistReadPort, TaskChecklistSummary } from '../ports/task-checklist-read.port';
import { GetCareOperationsUseCase } from './get-care-operations.use-case';
import {
  AddServiceOfferingUseCase,
  DeleteServiceOfferingUseCase,
  UpdateServiceOfferingUseCase,
} from './service-offering.use-cases';
import { UpdateGuardrailsUseCase } from './update-guardrails.use-case';
import { AddVisitFormatUseCase, UpdateVisitFormatUseCase } from './visit-format.use-cases';

const NOW = new Date('2026-11-09T09:00:00.000Z');
const clock: Clock = { now: () => NOW };

function sequentialIds(): IdGenerator {
  let n = 0;
  return {
    generate: () => {
      n += 1;
      return `id-${n}`;
    },
  };
}

class InMemoryServices implements ServiceOfferingRepository {
  store = new Map<string, ServiceOffering>();
  list(): Promise<ServiceOffering[]> {
    return Promise.resolve([...this.store.values()]);
  }
  findById(id: string): Promise<ServiceOffering | null> {
    return Promise.resolve(this.store.get(id) ?? null);
  }
  save(offering: ServiceOffering): Promise<void> {
    this.store.set(offering.id, offering);
    return Promise.resolve();
  }
  delete(id: string): Promise<void> {
    this.store.delete(id);
    return Promise.resolve();
  }
}

class InMemoryFormats implements VisitFormatRepository {
  store = new Map<string, VisitFormat>();
  list(): Promise<VisitFormat[]> {
    return Promise.resolve([...this.store.values()]);
  }
  findById(id: string): Promise<VisitFormat | null> {
    return Promise.resolve(this.store.get(id) ?? null);
  }
  save(format: VisitFormat): Promise<void> {
    this.store.set(format.id, format);
    return Promise.resolve();
  }
  delete(id: string): Promise<void> {
    this.store.delete(id);
    return Promise.resolve();
  }
}

class InMemoryGuardrails implements SchedulingGuardrailsRepository {
  current: SchedulingGuardrails | null = null;
  get(): Promise<SchedulingGuardrails | null> {
    return Promise.resolve(this.current);
  }
  save(guardrails: SchedulingGuardrails): Promise<void> {
    this.current = guardrails;
    return Promise.resolve();
  }
}

class FakeChecklists implements TaskChecklistReadPort {
  summaries: TaskChecklistSummary[] = [
    { id: 't1', name: 'Daily Check-in Checklist', taskCount: 5 },
  ];
  listActive(): Promise<TaskChecklistSummary[]> {
    return Promise.resolve(this.summaries);
  }
}

describe('Care operations flows', () => {
  let services: InMemoryServices;
  let formats: InMemoryFormats;
  let guardrails: InMemoryGuardrails;
  let checklists: FakeChecklists;
  let screen: GetCareOperationsUseCase;

  beforeEach(() => {
    services = new InMemoryServices();
    formats = new InMemoryFormats();
    guardrails = new InMemoryGuardrails();
    checklists = new FakeChecklists();
    screen = new GetCareOperationsUseCase(services, formats, guardrails, checklists, clock);
  });

  it('returns default guardrails and the task checklists when nothing is configured', async () => {
    const result = await screen.execute();
    expect(result.guardrails.minimumNoticeHours).toBe(24);
    expect(result.guardrails.autoAssignAlgorithm).toBe(AutoAssignAlgorithm.ProximityAndSkills);
    expect(result.taskChecklists).toEqual([
      { id: 't1', name: 'Daily Check-in Checklist', taskCount: 5 },
    ]);
  });

  it('adds, toggles and deletes a service offering', async () => {
    const add = new AddServiceOfferingUseCase(services, screen, clock, sequentialIds());
    const added = await add.execute({ name: 'Nursing Care' });
    expect(added.serviceOfferings).toHaveLength(1);
    const id = [...services.store.keys()][0];

    const toggled = await new UpdateServiceOfferingUseCase(services, screen, clock).execute({
      offeringId: id,
      isEnabled: false,
    });
    expect(toggled.serviceOfferings[0].isEnabled).toBe(false);

    const deleted = await new DeleteServiceOfferingUseCase(services, screen).execute(id);
    expect(deleted.serviceOfferings).toEqual([]);
  });

  it('adds a visit format with per currency rates', async () => {
    const add = new AddVisitFormatUseCase(formats, screen, clock, sequentialIds());
    const result = await add.execute({
      name: 'Overnight Care',
      durationMinutes: 720,
      rates: [
        { currency: Currency.NigerianNaira, baseRateMinor: 4_500_000 },
        { currency: Currency.UnitedStatesDollar, baseRateMinor: 9_000 },
      ],
    });
    expect(result.visitFormats[0].rates).toHaveLength(2);
    expect(result.visitFormats[0].durationMinutes).toBe(720);
  });

  it('rejects two rates in the same currency', async () => {
    const add = new AddVisitFormatUseCase(formats, screen, clock, sequentialIds());
    await expect(
      add.execute({
        name: 'Bad',
        rates: [
          { currency: Currency.NigerianNaira, baseRateMinor: 100 },
          { currency: Currency.NigerianNaira, baseRateMinor: 200 },
        ],
      }),
    ).rejects.toBeInstanceOf(ValidationException);
  });

  it('replaces the rates of an existing format', async () => {
    const add = new AddVisitFormatUseCase(formats, screen, clock, sequentialIds());
    await add.execute({ name: 'Standard Visit', durationMinutes: 60 });
    const id = [...formats.store.keys()][0];
    const updated = await new UpdateVisitFormatUseCase(formats, screen, clock).execute({
      formatId: id,
      rateUnit: RateUnit.PerHour,
      rates: [{ currency: Currency.NigerianNaira, baseRateMinor: 850_000 }],
    });
    expect(updated.visitFormats[0].rateUnit).toBe(RateUnit.PerHour);
    expect(updated.visitFormats[0].rates[0].baseRateMinor).toBe(850_000);
  });

  it('raises updating a missing format', async () => {
    await expect(
      new UpdateVisitFormatUseCase(formats, screen, clock).execute({ formatId: 'nope', name: 'x' }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });

  it('updates the scheduling guardrails and rejects a non positive max', async () => {
    const update = new UpdateGuardrailsUseCase(guardrails, screen, clock);
    const result = await update.execute({
      minimumNoticeHours: 48,
      autoAssignAlgorithm: AutoAssignAlgorithm.RoundRobin,
    });
    expect(result.guardrails.minimumNoticeHours).toBe(48);
    expect(result.guardrails.autoAssignAlgorithm).toBe(AutoAssignAlgorithm.RoundRobin);
    await expect(update.execute({ maxVisitsPerCaregiverPerDay: 0 })).rejects.toBeInstanceOf(
      ValidationException,
    );
  });
});
