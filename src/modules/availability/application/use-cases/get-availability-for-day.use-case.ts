import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import {
  CAREGIVER_AVAILABILITY_REPOSITORY,
  CaregiverAvailabilityRepository,
} from '../../domain/caregiver-availability.repository';
import { startOfUtcDay, toIsoDate } from '../availability-date.util';
import { DayAvailabilityResult } from '../dto/availability.result';
import { BOOKED_SLOTS_DIRECTORY, BookedSlotsDirectory } from '../ports/booked-slots.directory';

export interface GetAvailabilityForDayQuery {
  caregiverId: string;
  date?: Date;
}

/**
 * Use case: the availability picker's single day view. Composes the caregiver's
 * declared availability for the day with the windows already booked by scheduled
 * visits, so the client can render slots as available, selected or disabled in one
 * read. Defaults to today. Scoped to the authenticated caregiver.
 */
@Injectable()
export class GetAvailabilityForDayUseCase {
  constructor(
    @Inject(CAREGIVER_AVAILABILITY_REPOSITORY)
    private readonly availability: CaregiverAvailabilityRepository,
    @Inject(BOOKED_SLOTS_DIRECTORY) private readonly booked: BookedSlotsDirectory,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(query: GetAvailabilityForDayQuery): Promise<DayAvailabilityResult> {
    const day = startOfUtcDay(query.date ?? this.clock.now());

    const [record, bookedSlots] = await Promise.all([
      this.availability.findByCaregiverAndDate(query.caregiverId, day),
      this.booked.forCaregiverOnDay(query.caregiverId, day),
    ]);

    return {
      date: toIsoDate(day),
      availableSlots:
        record === null
          ? []
          : record.slots.map((slot) => ({
              startMinute: slot.startMinute,
              endMinute: slot.endMinute,
            })),
      bookedSlots,
    };
  }
}
