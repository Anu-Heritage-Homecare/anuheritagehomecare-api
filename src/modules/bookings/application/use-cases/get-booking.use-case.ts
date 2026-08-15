import { Inject, Injectable } from '@nestjs/common';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { BOOKING_REPOSITORY, BookingRepository } from '../../domain/booking.repository';
import { BookingResult, toBookingResult } from '../dto/booking.result';

/** Use case: fetch one booking owned by the authenticated owner. */
@Injectable()
export class GetBookingUseCase {
  constructor(@Inject(BOOKING_REPOSITORY) private readonly bookings: BookingRepository) {}

  async execute(params: { ownerId: string; bookingId: string }): Promise<BookingResult> {
    const booking = await this.bookings.findById(params.bookingId);
    if (booking === null || booking.ownerId !== params.ownerId) {
      throw new NotFoundDomainException('Booking not found');
    }
    return toBookingResult(booking);
  }
}
