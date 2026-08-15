import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BookingConfig } from '@config/configuration';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ValidationException } from '@shared/domain/domain-exception';
import { TimeOfDay } from '../../domain/value-objects/time-of-day.vo';
import { AvailabilityResult, AvailabilitySlotResult } from '../dto/availability.result';

/**
 * Use case: list the bookable time slots for a date. Slots are hourly within the
 * configured business hours. Real caregiver availability does not exist yet, so
 * every future slot is offered; only past slots (relative to now) are closed.
 * Times are treated as UTC for now; timezone handling arrives with scheduling.
 */
@Injectable()
export class GetAvailabilityUseCase {
  private readonly booking: BookingConfig;

  constructor(
    config: ConfigService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {
    this.booking = config.getOrThrow<BookingConfig>('booking');
  }

  execute(params: { date: string }): AvailabilityResult {
    const day = new Date(`${params.date}T00:00:00.000Z`);
    if (Number.isNaN(day.getTime())) {
      throw new ValidationException('Date must be a valid calendar date');
    }

    const now = this.clock.now();
    const slots: AvailabilitySlotResult[] = [];
    for (let hour = this.booking.dayStartHour; hour <= this.booking.dayEndHour; hour += 1) {
      const slotStart = Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), hour);
      slots.push({
        startTime: TimeOfDay.fromMinutes(hour * 60).toString(),
        available: slotStart > now.getTime(),
      });
    }

    return { date: params.date, slots };
  }
}
