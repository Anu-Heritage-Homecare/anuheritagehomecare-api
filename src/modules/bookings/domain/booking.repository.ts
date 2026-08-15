import { Booking } from './booking.entity';

/** Persistence port for the Booking aggregate. */
export interface BookingRepository {
  save(booking: Booking): Promise<void>;
  findById(id: string): Promise<Booking | null>;
  listByOwner(ownerId: string): Promise<Booking[]>;
}

export const BOOKING_REPOSITORY = Symbol('BOOKING_REPOSITORY');
