import { Inject, Injectable } from '@nestjs/common';
import {
  CARE_RECIPIENT_REPOSITORY,
  CareRecipientRepository,
} from '@modules/care-recipients/domain/care-recipient.repository';
import {
  APPOINTMENT_CATEGORIES,
  HealthEventCategory,
} from '@modules/care-recipients/domain/health-event-category.enum';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { HEALTH_EVENT_READ_MODEL, HealthEventReadModel } from '../ports/health-event-read.port';
import {
  RECIPIENT_VITALS_DIRECTORY,
  RecipientVitalsDirectory,
  VitalsReadingView,
} from '../ports/recipient-vitals.port';
import {
  LastVitalsResult,
  RecipientHealthResult,
  TrendSeriesResult,
  VitalsTrendResult,
} from '../dto/recipient-health.result';

export interface GetRecipientHealthQuery {
  recipientId: string;
  categories: HealthEventCategory[] | null;
  search: string | null;
  page: number;
  pageSize: number;
}

/** How many recent readings feed the trend sparklines. */
const TREND_READINGS = 30;
/** Cap on the points shown in a single sparkline. */
const TREND_POINTS = 12;

/**
 * Use case: assemble one recipient's Health tab. Composes the primary conditions
 * (care recipients context), the recorded vital signs for the last vitals card and
 * the trend sparklines (visits context), the next upcoming appointment, and the
 * filtered, paginated health event timeline.
 */
@Injectable()
export class GetRecipientHealthUseCase {
  constructor(
    @Inject(CARE_RECIPIENT_REPOSITORY) private readonly recipients: CareRecipientRepository,
    @Inject(RECIPIENT_VITALS_DIRECTORY) private readonly vitals: RecipientVitalsDirectory,
    @Inject(HEALTH_EVENT_READ_MODEL) private readonly events: HealthEventReadModel,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(query: GetRecipientHealthQuery): Promise<RecipientHealthResult> {
    const recipient = await this.recipients.findById(query.recipientId);
    if (recipient === null) {
      throw new NotFoundDomainException('Care recipient not found');
    }

    const now = this.clock.now();
    const [readings, timeline, nextAppointment] = await Promise.all([
      this.vitals.recentReadings(query.recipientId, TREND_READINGS),
      this.events.listPage({
        recipientId: query.recipientId,
        categories: query.categories,
        search: query.search,
        page: query.page,
        pageSize: query.pageSize,
      }),
      this.events.nextInCategories(query.recipientId, now, [...APPOINTMENT_CATEGORIES]),
    ]);

    const conditions = recipient.health?.medicalConditions ?? [];
    const totalPages = query.pageSize > 0 ? Math.ceil(timeline.total / query.pageSize) : 0;

    return {
      primaryConditions: {
        primary: conditions[0] ?? null,
        others: conditions.slice(1),
      },
      lastVitals: this.buildLastVitals(readings),
      nextAppointment:
        nextAppointment === null
          ? null
          : {
              providerName: nextAppointment.recordedByName,
              title: nextAppointment.title,
              description: nextAppointment.description,
              at: nextAppointment.occurredAt,
            },
      vitalsTrend: this.buildTrend(readings),
      timeline: {
        items: timeline.rows.map((row) => ({
          id: row.id,
          category: String(row.category),
          title: row.title,
          description: row.description,
          recordedByName: row.recordedByName,
          recordedByRole: row.recordedByRole,
          occurredAt: row.occurredAt,
        })),
        page: query.page,
        pageSize: query.pageSize,
        total: timeline.total,
        totalPages,
      },
    };
  }

  private buildLastVitals(readings: VitalsReadingView[]): LastVitalsResult | null {
    const latest = readings[0];
    if (latest === undefined) {
      return null;
    }
    return {
      systolic: latest.systolic,
      diastolic: latest.diastolic,
      heartRate: latest.heartRate,
      oxygenSaturation: latest.oxygenSaturation,
      weightGrams: latest.weightGrams,
      temperatureCelsius: latest.temperatureTenths === null ? null : latest.temperatureTenths / 10,
      bloodGlucose: latest.bloodGlucose,
      recordedAt: latest.recordedAt,
    };
  }

  private buildTrend(readings: VitalsReadingView[]): VitalsTrendResult {
    // `readings` is most recent first; reverse for chronological sparklines.
    const chronological = [...readings].reverse();
    const withBp = readings.find((r) => r.systolic !== null);
    return {
      bloodPressure: {
        latestSystolic: withBp?.systolic ?? null,
        latestDiastolic: withBp?.diastolic ?? null,
        systolicSeries: series(chronological, (r) => r.systolic),
      },
      heartRate: this.trend(readings, chronological, (r) => r.heartRate),
      bloodGlucose: this.trend(readings, chronological, (r) => r.bloodGlucose),
      weightGrams: this.trend(readings, chronological, (r) => r.weightGrams),
      oxygen: this.trend(readings, chronological, (r) => r.oxygenSaturation),
    };
  }

  private trend(
    desc: VitalsReadingView[],
    chronological: VitalsReadingView[],
    pick: (reading: VitalsReadingView) => number | null,
  ): TrendSeriesResult {
    const latest = desc.find((r) => pick(r) !== null);
    return {
      latest: latest === undefined ? null : pick(latest),
      series: series(chronological, pick),
    };
  }
}

/** The non null values of a vital across the readings, capped to the sparkline length. */
function series(
  chronological: VitalsReadingView[],
  pick: (reading: VitalsReadingView) => number | null,
): number[] {
  const values = chronological.map(pick).filter((value): value is number => value !== null);
  return values.slice(Math.max(0, values.length - TREND_POINTS));
}
