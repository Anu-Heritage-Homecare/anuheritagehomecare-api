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
  planType: CarePlanType;
  hours: number;
}

/**
 * Use case: price the selected hourly plan for the owner's market without
 * persisting anything. Powers the booking summary screen, pricing the same plan
 * the booking would, so the price the user sees matches the booking that is
 * created. Server authoritative; rejects a monthly plan.
 */
@Injectable()
export class QuoteFlexibleBookingUseCase {
  constructor(@Inject(CARE_PLAN_REPOSITORY) private readonly plans: CarePlanRepository) {}

  async execute(query: QuoteFlexibleBookingQuery): Promise<BookingQuoteResult> {
    const plan = await this.plans.findByType(query.planType);
    if (plan === null || !plan.active) {
      throw new NotFoundDomainException('The selected plan is not available');
    }
    if (!plan.isHourly) {
      throw new ValidationException(
        'That plan is a monthly subscription; subscribe to it instead of booking hourly',
      );
    }
    plan.assertHoursAllowed(query.hours);

    const price = plan.priceFor(query.currency);
    if (price === null) {
      throw new ValidationException('The selected plan is not offered in your currency');
    }

    return toBookingQuoteResult(
      BookingPrice.compute(price.unitAmount, price.serviceFee, query.hours),
    );
  }
}
