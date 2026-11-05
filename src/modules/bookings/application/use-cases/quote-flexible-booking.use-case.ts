import { Inject, Injectable } from '@nestjs/common';
import { Currency } from '@shared/domain/currency.enum';
import { NotFoundDomainException, ValidationException } from '@shared/domain/domain-exception';
import {
  CARE_PLAN_REPOSITORY,
  CarePlanRepository,
} from '@modules/care-plans/domain/care-plan.repository';
import { CarePlanType } from '@modules/care-plans/domain/care-plan-type.enum';
import { BookingPrice } from '../../domain/value-objects/booking-price.vo';
import { BookingQuoteResult, toBookingQuoteResult } from '../dto/booking-quote.result';

export interface QuoteFlexibleBookingQuery {
  currency: Currency;
  hours: number;
}

/**
 * Use case: price a Flexible booking for the owner's market without persisting
 * anything. Powers the booking summary screen so the price breakdown stays
 * server authoritative, computed identically to creating the booking.
 */
@Injectable()
export class QuoteFlexibleBookingUseCase {
  constructor(@Inject(CARE_PLAN_REPOSITORY) private readonly plans: CarePlanRepository) {}

  async execute(query: QuoteFlexibleBookingQuery): Promise<BookingQuoteResult> {
    const plan = await this.plans.findByType(CarePlanType.Flexible);
    if (plan === null || !plan.active) {
      throw new NotFoundDomainException('The Flexible plan is not available');
    }
    plan.assertHoursAllowed(query.hours);

    const price = plan.priceFor(query.currency);
    if (price === null) {
      throw new ValidationException('The Flexible plan is not offered in your currency');
    }

    return toBookingQuoteResult(
      BookingPrice.compute(price.unitAmount, price.serviceFee, query.hours),
    );
  }
}
