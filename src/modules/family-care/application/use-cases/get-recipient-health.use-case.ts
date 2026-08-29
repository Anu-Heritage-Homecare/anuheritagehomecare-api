import { Inject, Injectable } from '@nestjs/common';
import {
  CARE_RECIPIENT_REPOSITORY,
  CareRecipientRepository,
} from '@modules/care-recipients/domain/care-recipient.repository';
import { VISIT_REPOSITORY, VisitRepository } from '@modules/visits/domain/visit.repository';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { VitalsReading } from '@modules/visits/domain/value-objects/vitals-reading.vo';
import { Visit } from '@modules/visits/domain/visit.entity';
import { RecipientHealthResult } from '../dto/care-section.result';
import { startOfUtcDay } from '../family-care-date.util';
import { pickCurrentVisit } from '../pick-current-visit.util';

export interface GetRecipientHealthQuery {
  ownerId: string;
  careRecipientId: string;
}

type Status = 'NORMAL' | 'ATTENTION';

/**
 * Use case: today's health snapshot for a recipient: the latest vitals (each
 * classified normal or needing attention) and the caregiver's observations from
 * today's visit. Owner scoped.
 */
@Injectable()
export class GetRecipientHealthUseCase {
  constructor(
    @Inject(CARE_RECIPIENT_REPOSITORY) private readonly recipients: CareRecipientRepository,
    @Inject(VISIT_REPOSITORY) private readonly visits: VisitRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(query: GetRecipientHealthQuery): Promise<RecipientHealthResult> {
    const recipient = await this.recipients.findById(query.careRecipientId);
    if (recipient === null || recipient.ownerId !== query.ownerId) {
      throw new NotFoundDomainException('Care recipient not found');
    }

    const day = startOfUtcDay(this.clock.now());
    const visit = pickCurrentVisit(
      await this.visits.listForCareRecipientsInRange([query.careRecipientId], day, day),
    );

    const latest = visit === null ? null : this.latestReading(visit);
    return {
      recordedAt: latest === null ? null : latest.recordedAt.toISOString(),
      vitals: this.buildVitals(latest),
      observation: {
        mood: visit?.observation.mood ?? null,
        appetite: visit?.observation.appetite ?? null,
        mobility: visit?.observation.mobility ?? null,
        medicationStatus: visit?.observation.medicationStatus ?? null,
      },
    };
  }

  private latestReading(visit: Visit): VitalsReading | null {
    const readings = [...visit.vitals].sort(
      (a, b) => a.recordedAt.getTime() - b.recordedAt.getTime(),
    );
    return readings.at(-1) ?? null;
  }

  private buildVitals(reading: VitalsReading | null): RecipientHealthResult['vitals'] {
    if (reading === null) {
      return {
        bloodPressure: null,
        heartRate: null,
        temperatureCelsius: null,
        oxygenSaturation: null,
      };
    }
    return {
      bloodPressure:
        reading.systolic !== null && reading.diastolic !== null
          ? {
              value: { systolic: reading.systolic, diastolic: reading.diastolic },
              status: bloodPressureStatus(reading.systolic, reading.diastolic),
            }
          : null,
      heartRate:
        reading.heartRate === null
          ? null
          : { value: reading.heartRate, status: rangeStatus(reading.heartRate, 60, 100) },
      temperatureCelsius:
        reading.temperatureCelsius === null
          ? null
          : {
              value: reading.temperatureCelsius,
              status: rangeStatus(reading.temperatureCelsius, 36.1, 37.5),
            },
      oxygenSaturation:
        reading.oxygenSaturation === null
          ? null
          : {
              value: reading.oxygenSaturation,
              status: reading.oxygenSaturation >= 95 ? 'NORMAL' : 'ATTENTION',
            },
    };
  }
}

function rangeStatus(value: number, min: number, max: number): Status {
  return value >= min && value <= max ? 'NORMAL' : 'ATTENTION';
}

function bloodPressureStatus(systolic: number, diastolic: number): Status {
  const normal = systolic >= 90 && systolic <= 140 && diastolic >= 60 && diastolic <= 90;
  return normal ? 'NORMAL' : 'ATTENTION';
}
