import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ValidationException } from '@shared/domain/domain-exception';
import {
  CAREGIVER_AVAILABILITY_REPOSITORY,
  CaregiverAvailabilityRepository,
} from '../../domain/caregiver-availability.repository';
import { startOfUtcDay } from '../availability-date.util';
import { AvailabilityResult, toAvailabilityResult } from '../dto/availability.result';

/** Widest range a single availability request may span, to bound the query. */
const MAX_RANGE_DAYS = 62;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface GetCaregiverAvailabilityQuery {
  caregiverId: string;
  from?: Date;
  to?: Date;
}

/**
 * Use case: a caregiver's declared availability for a single day or an inclusive
 * date range (the week strip). With no range it defaults to today from the clock.
 * Only days that have a record are returned; a day with no record simply means no
 * availability has been set for it yet.
 */
@Injectable()
export class GetCaregiverAvailabilityUseCase {
  constructor(
    @Inject(CAREGIVER_AVAILABILITY_REPOSITORY)
    private readonly availability: CaregiverAvailabilityRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(query: GetCaregiverAvailabilityQuery): Promise<AvailabilityResult[]> {
    const now = this.clock.now();
    const from = startOfUtcDay(query.from ?? now);
    const to = startOfUtcDay(query.to ?? query.from ?? now);

    if (to.getTime() < from.getTime()) {
      throw new ValidationException('The end date cannot be before the start date');
    }
    if (to.getTime() - from.getTime() > MAX_RANGE_DAYS * DAY_MS) {
      throw new ValidationException(`The availability range cannot exceed ${MAX_RANGE_DAYS} days`);
    }

    const records = await this.availability.listForCaregiverInRange(query.caregiverId, from, to);
    return records.map(toAvailabilityResult);
  }
}
