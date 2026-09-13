import { CareRecipient } from '@modules/care-recipients/domain/care-recipient.entity';
import { CareRecipientRepository } from '@modules/care-recipients/domain/care-recipient.repository';
import { HealthEventCategory } from '@modules/care-recipients/domain/health-event-category.enum';
import { Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import {
  HealthEventFilter,
  HealthEventPageView,
  HealthEventReadModel,
  HealthEventRowView,
} from '../ports/health-event-read.port';
import { RecipientVitalsDirectory, VitalsReadingView } from '../ports/recipient-vitals.port';
import { GetRecipientHealthUseCase } from './get-recipient-health.use-case';

const NOW = new Date('2026-07-24T12:00:00.000Z');
const clock: Clock = { now: () => NOW };
const R = 'r1';

function recipients(health: { medicalConditions: string[] } | null): CareRecipientRepository {
  const recipient = { id: R, health } as unknown as CareRecipient;
  return {
    save: () => Promise.resolve(),
    findById: (id) => Promise.resolve(id === R ? recipient : null),
    findByIds: () => Promise.resolve([]),
    listByOwner: () => Promise.resolve([]),
  };
}

function reading(overrides: Partial<VitalsReadingView>): VitalsReadingView {
  return {
    systolic: null,
    diastolic: null,
    heartRate: null,
    oxygenSaturation: null,
    weightGrams: null,
    temperatureTenths: null,
    bloodGlucose: null,
    recordedAt: new Date('2026-07-24T08:00:00.000Z'),
    ...overrides,
  };
}

function vitals(readings: VitalsReadingView[]): RecipientVitalsDirectory {
  return { recentReadings: () => Promise.resolve(readings) };
}

function appointment(overrides: Partial<HealthEventRowView>): HealthEventRowView {
  return {
    id: 'e1',
    category: HealthEventCategory.Appointment,
    title: 'Quarterly Review',
    description: 'Scheduled review',
    recordedByName: 'Dr. Kim',
    recordedByRole: 'Geriatrician',
    occurredAt: new Date('2026-11-05T00:00:00.000Z'),
    ...overrides,
  };
}

class FakeEvents implements HealthEventReadModel {
  public lastFilter: HealthEventFilter | null = null;
  constructor(
    private readonly page: HealthEventPageView,
    private readonly next: HealthEventRowView | null,
  ) {}
  listPage(filter: HealthEventFilter): Promise<HealthEventPageView> {
    this.lastFilter = filter;
    return Promise.resolve(this.page);
  }
  nextInCategories(): Promise<HealthEventRowView | null> {
    return Promise.resolve(this.next);
  }
}

const baseQuery = {
  recipientId: R,
  categories: null,
  search: null,
  page: 1,
  pageSize: 8,
};

describe('GetRecipientHealthUseCase', () => {
  it('rejects an unknown recipient', async () => {
    const useCase = new GetRecipientHealthUseCase(
      recipients(null),
      vitals([]),
      new FakeEvents({ rows: [], total: 0 }, null),
      clock,
    );
    await expect(useCase.execute({ ...baseQuery, recipientId: 'nope' })).rejects.toBeInstanceOf(
      NotFoundDomainException,
    );
  });

  it('splits primary and secondary conditions', async () => {
    const useCase = new GetRecipientHealthUseCase(
      recipients({
        medicalConditions: ["Alzheimer's (Stage 2)", 'Hypertension', 'Type 2 Diabetes'],
      }),
      vitals([]),
      new FakeEvents({ rows: [], total: 0 }, null),
      clock,
    );
    const result = await useCase.execute(baseQuery);
    expect(result.primaryConditions.primary).toBe("Alzheimer's (Stage 2)");
    expect(result.primaryConditions.others).toEqual(['Hypertension', 'Type 2 Diabetes']);
  });

  it('derives last vitals and chronological trend sparklines from recent readings', async () => {
    // Directory returns most recent first.
    const readings = [
      reading({
        systolic: 128,
        diastolic: 82,
        heartRate: 72,
        bloodGlucose: 142,
        temperatureTenths: 366,
        recordedAt: new Date('2026-07-24T08:00:00.000Z'),
      }),
      reading({
        systolic: 132,
        diastolic: 84,
        heartRate: 75,
        bloodGlucose: 150,
        recordedAt: new Date('2026-07-20T08:00:00.000Z'),
      }),
    ];
    const useCase = new GetRecipientHealthUseCase(
      recipients({ medicalConditions: [] }),
      vitals(readings),
      new FakeEvents({ rows: [], total: 0 }, null),
      clock,
    );
    const result = await useCase.execute(baseQuery);
    expect(result.lastVitals?.systolic).toBe(128);
    expect(result.lastVitals?.temperatureCelsius).toBe(36.6);
    expect(result.lastVitals?.bloodGlucose).toBe(142);
    // Chronological: oldest (132) first, newest (128) last.
    expect(result.vitalsTrend.bloodPressure.systolicSeries).toEqual([132, 128]);
    expect(result.vitalsTrend.bloodPressure.latestSystolic).toBe(128);
    expect(result.vitalsTrend.heartRate.series).toEqual([75, 72]);
    expect(result.vitalsTrend.bloodGlucose.latest).toBe(142);
  });

  it('surfaces the next appointment from the appointment categories', async () => {
    const useCase = new GetRecipientHealthUseCase(
      recipients({ medicalConditions: [] }),
      vitals([]),
      new FakeEvents({ rows: [], total: 0 }, appointment({})),
      clock,
    );
    const result = await useCase.execute(baseQuery);
    expect(result.nextAppointment?.providerName).toBe('Dr. Kim');
    expect(result.nextAppointment?.at.toISOString()).toBe('2026-11-05T00:00:00.000Z');
  });

  it('passes the category filter through and paginates the timeline', async () => {
    const events = new FakeEvents(
      {
        rows: [
          {
            id: 't1',
            category: HealthEventCategory.Incident,
            title: 'Fall Incident',
            description: 'Minor fall',
            recordedByName: 'Sarah Williams',
            recordedByRole: 'Caregiver',
            occurredAt: new Date('2026-07-15T00:00:00.000Z'),
          },
        ],
        total: 17,
      },
      null,
    );
    const useCase = new GetRecipientHealthUseCase(
      recipients({ medicalConditions: [] }),
      vitals([]),
      events,
      clock,
    );
    const result = await useCase.execute({
      ...baseQuery,
      categories: [HealthEventCategory.Incident],
      page: 2,
      pageSize: 8,
    });
    expect(events.lastFilter?.categories).toEqual([HealthEventCategory.Incident]);
    expect(result.timeline.total).toBe(17);
    expect(result.timeline.totalPages).toBe(3);
    expect(result.timeline.items[0].category).toBe('INCIDENT');
    expect(result.timeline.items[0].recordedByRole).toBe('Caregiver');
  });
});
