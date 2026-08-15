import { Inject, Injectable } from '@nestjs/common';
import { BOOKING_REPOSITORY, BookingRepository } from '../../domain/booking.repository';
import { BookingResult, toBookingResult } from '../dto/booking.result';

/** Use case: list every booking owned by the authenticated owner. */
@Injectable()
export class ListBookingsUseCase {
  constructor(@Inject(BOOKING_REPOSITORY) private readonly bookings: BookingRepository) {}

  async execute(params: { ownerId: string }): Promise<BookingResult[]> {
    const bookings = await this.bookings.listByOwner(params.ownerId);
    return bookings.map(toBookingResult);
  }
}
