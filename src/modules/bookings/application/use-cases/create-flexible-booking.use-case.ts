import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BookingConfig } from '@config/configuration';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import { NotFoundDomainException, ValidationException } from '@shared/domain/domain-exception';
import {
  CARE_PLAN_REPOSITORY,
  CarePlanRepository,
} from '@modules/care-plans/domain/care-plan.repository';
import { CarePlanType } from '@modules/care-plans/domain/care-plan-type.enum';
import { Booking } from '../../domain/booking.entity';
import { BOOKING_REPOSITORY, BookingRepository } from '../../domain/booking.repository';
import { BookingPrice } from '../../domain/value-objects/booking-price.vo';
import { TimeOfDay } from '../../domain/value-objects/time-of-day.vo';
import { CreateFlexibleBookingCommand } from '../commands/create-flexible-booking.command';
import { BookingResult, toBookingResult } from '../dto/booking.result';
import { CARE_RECIPIENT_ACCESS, CareRecipientAccess } from '../ports/care-recipient-access.port';

/**
 * Use case: create a Flexible hourly booking for a care recipient. Ownership and
 * onboarding are verified, the hours are checked against the plan, and the price
 * is computed server side from the catalog and snapshotted. The booking starts
 * awaiting payment.
 */
@Injectable()
export class CreateFlexibleBookingUseCase {
  private readonly booking: BookingConfig;

  constructor(
    @Inject(BOOKING_REPOSITORY) private readonly bookings: BookingRepository,
    @Inject(CARE_PLAN_REPOSITORY) private readonly plans: CarePlanRepository,
    @Inject(CARE_RECIPIENT_ACCESS) private readonly recipients: CareRecipientAccess,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    config: ConfigService,
  ) {
    this.booking = config.getOrThrow<BookingConfig>('booking');
  }

  async execute(command: CreateFlexibleBookingCommand): Promise<BookingResult> {
    await this.recipients.assertBookable(command.ownerId, command.careRecipientId);

    const plan = await this.plans.findByType(CarePlanType.Flexible);
    if (plan === null || !plan.active) {
      throw new NotFoundDomainException('The Flexible plan is not available');
    }
    plan.assertHoursAllowed(command.hours);

    const price = plan.priceFor(command.currency);
    if (price === null) {
      throw new ValidationException('The Flexible plan is not offered in your currency');
    }

    const startTime = TimeOfDay.fromString(command.startTime);
    this.assertWithinBusinessHours(startTime);
    const serviceDate = this.parseFutureDate(command.serviceDate, startTime);

    const bookingPrice = BookingPrice.compute(price.unitAmount, price.serviceFee, command.hours);

    const booking = Booking.createFlexible({
      id: this.ids.generate(),
      ownerId: command.ownerId,
      careRecipientId: command.careRecipientId,
      hours: command.hours,
      serviceDate,
      startTime,
      price: bookingPrice,
      now: this.clock.now(),
    });

    await this.bookings.save(booking);
    booking.clearDomainEvents();

    return toBookingResult(booking);
  }

  private assertWithinBusinessHours(startTime: TimeOfDay): void {
    if (startTime.hour < this.booking.dayStartHour || startTime.hour > this.booking.dayEndHour) {
      throw new ValidationException('The selected start time is outside bookable hours');
    }
  }

  private parseFutureDate(raw: string, startTime: TimeOfDay): Date {
    const date = new Date(`${raw}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime())) {
      throw new ValidationException('Service date must be a valid calendar date');
    }
    const now = this.clock.now();
    const slotStart = Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      startTime.hour,
    );
    if (slotStart <= now.getTime()) {
      throw new ValidationException('The selected date and time is in the past');
    }
    return date;
  }
}
