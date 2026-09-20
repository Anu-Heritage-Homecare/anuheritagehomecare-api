import { Inject, Injectable } from '@nestjs/common';
import {
  CAREGIVER_PROFILE_REPOSITORY,
  CaregiverProfileRepository,
} from '@modules/caregiver-profile/domain/caregiver-profile.repository';
import { CaregiverAvailability } from '@modules/availability/domain/caregiver-availability.entity';
import {
  CAREGIVER_AVAILABILITY_REPOSITORY,
  CaregiverAvailabilityRepository,
} from '@modules/availability/domain/caregiver-availability.repository';
import { AvailabilitySlot } from '@modules/availability/domain/value-objects/availability-slot.vo';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';

export interface SetCaregiverAvailabilityCommand {
  profileId: string;
  days: { date: Date; slots: { startMinute: number; endMinute: number }[] }[];
}

/**
 * Admin sets (replaces) a caregiver's availability for one or more specific days.
 * Each day is keyed by caregiver and date, so saving again overwrites that day's
 * windows; the mockup edits a week, and the caller supplies each date of that
 * week. Domain rules (each window inside the day, ordered and non overlapping) are
 * enforced by the availability aggregate, which is shared with the mobile flow. A
 * standing weekly recurring template is not modelled; availability is per date.
 */
@Injectable()
export class SetCaregiverAvailabilityUseCase {
  constructor(
    @Inject(CAREGIVER_PROFILE_REPOSITORY) private readonly profiles: CaregiverProfileRepository,
    @Inject(CAREGIVER_AVAILABILITY_REPOSITORY)
    private readonly availability: CaregiverAvailabilityRepository,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: SetCaregiverAvailabilityCommand): Promise<void> {
    const profile = await this.profiles.findById(command.profileId);
    if (profile === null || profile.isArchived) {
      throw new NotFoundDomainException('Caregiver not found');
    }
    const caregiverId = profile.userId;
    const now = this.clock.now();

    for (const day of command.days) {
      const date = startOfUtcDay(day.date);
      const slots = day.slots.map((slot) =>
        AvailabilitySlot.create(slot.startMinute, slot.endMinute),
      );
      const existing = await this.availability.findByCaregiverAndDate(caregiverId, date);
      const record =
        existing ??
        CaregiverAvailability.create({ id: this.ids.generate(), caregiverId, date, now });
      record.setSlots(slots, now);
      await this.availability.save(record);
    }
  }
}

/** Midnight (UTC) of the day the instant falls on. */
function startOfUtcDay(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}
