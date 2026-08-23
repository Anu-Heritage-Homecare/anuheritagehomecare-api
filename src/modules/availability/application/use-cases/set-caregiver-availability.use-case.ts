import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import { CaregiverAvailability } from '../../domain/caregiver-availability.entity';
import {
  CAREGIVER_AVAILABILITY_REPOSITORY,
  CaregiverAvailabilityRepository,
} from '../../domain/caregiver-availability.repository';
import { AvailabilitySlot } from '../../domain/value-objects/availability-slot.vo';
import { startOfUtcDay } from '../availability-date.util';
import { AvailabilityResult, toAvailabilityResult } from '../dto/availability.result';

export interface SetCaregiverAvailabilityCommand {
  caregiverId: string;
  date: Date;
  slots: { startMinute: number; endMinute: number }[];
}

/**
 * Use case: a caregiver sets (replaces) their availability for a single day. It
 * is idempotent per day: the record is keyed by caregiver and date, so saving
 * again overwrites the whole set of windows. Domain rules (each window inside the
 * day, ordered and non overlapping) are enforced in the aggregate.
 */
@Injectable()
export class SetCaregiverAvailabilityUseCase {
  constructor(
    @Inject(CAREGIVER_AVAILABILITY_REPOSITORY)
    private readonly availability: CaregiverAvailabilityRepository,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: SetCaregiverAvailabilityCommand): Promise<AvailabilityResult> {
    const day = startOfUtcDay(command.date);
    const now = this.clock.now();
    const slots = command.slots.map((slot) =>
      AvailabilitySlot.create(slot.startMinute, slot.endMinute),
    );

    const existing = await this.availability.findByCaregiverAndDate(command.caregiverId, day);
    const record =
      existing ??
      CaregiverAvailability.create({
        id: this.ids.generate(),
        caregiverId: command.caregiverId,
        date: day,
        now,
      });

    record.setSlots(slots, now);
    await this.availability.save(record);
    return toAvailabilityResult(record);
  }
}
