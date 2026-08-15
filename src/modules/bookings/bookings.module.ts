import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { CarePlansModule } from '@modules/care-plans/care-plans.module';
import { CareRecipientsModule } from '@modules/care-recipients/care-recipients.module';
import { CARE_RECIPIENT_ACCESS } from './application/ports/care-recipient-access.port';
import { CreateFlexibleBookingUseCase } from './application/use-cases/create-flexible-booking.use-case';
import { CreateSubscriptionUseCase } from './application/use-cases/create-subscription.use-case';
import { GetAvailabilityUseCase } from './application/use-cases/get-availability.use-case';
import { GetBookingUseCase } from './application/use-cases/get-booking.use-case';
import { ListBookingsUseCase } from './application/use-cases/list-bookings.use-case';
import { ListSubscriptionsUseCase } from './application/use-cases/list-subscriptions.use-case';
import { BOOKING_REPOSITORY } from './domain/booking.repository';
import { SUBSCRIPTION_REPOSITORY } from './domain/subscription.repository';
import { PrismaCareRecipientAccess } from './infrastructure/access/prisma-care-recipient-access';
import { BookingPrismaRepository } from './infrastructure/persistence/booking-prisma.repository';
import { SubscriptionPrismaRepository } from './infrastructure/persistence/subscription-prisma.repository';
import { BookingsController } from './presentation/bookings.controller';
import { SubscriptionsController } from './presentation/subscriptions.controller';

/**
 * Bookings and subscriptions composition root. Depends on the care plans catalog
 * for pricing and on the care recipients context to verify ownership before
 * booking care. Every domain port is bound to its adapter here.
 */
@Module({
  imports: [PassportModule, CarePlansModule, CareRecipientsModule],
  controllers: [BookingsController, SubscriptionsController],
  providers: [
    GetAvailabilityUseCase,
    CreateFlexibleBookingUseCase,
    GetBookingUseCase,
    ListBookingsUseCase,
    CreateSubscriptionUseCase,
    ListSubscriptionsUseCase,
    { provide: BOOKING_REPOSITORY, useClass: BookingPrismaRepository },
    { provide: SUBSCRIPTION_REPOSITORY, useClass: SubscriptionPrismaRepository },
    { provide: CARE_RECIPIENT_ACCESS, useClass: PrismaCareRecipientAccess },
  ],
  exports: [BOOKING_REPOSITORY, SUBSCRIPTION_REPOSITORY],
})
export class BookingsModule {}
