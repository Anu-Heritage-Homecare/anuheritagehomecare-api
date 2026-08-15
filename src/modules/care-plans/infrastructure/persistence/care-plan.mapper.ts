import {
  BillingModel as PrismaBillingModel,
  CarePlan as PrismaCarePlan,
  CarePlanPrice as PrismaCarePlanPrice,
  CarePlanType as PrismaCarePlanType,
  Currency as PrismaCurrency,
} from '@prisma/client';
import { Currency } from '@shared/domain/currency.enum';
import { Money } from '@shared/domain/money.vo';
import { BillingModel } from '../../domain/billing-model.enum';
import { CarePlan } from '../../domain/care-plan.entity';
import { CarePlanType } from '../../domain/care-plan-type.enum';
import { CarePlanPrice } from '../../domain/value-objects/care-plan-price.vo';

type PrismaCarePlanWithPrices = PrismaCarePlan & { prices: PrismaCarePlanPrice[] };

/** Translates the Prisma care plan rows into the CarePlan aggregate. */
export class CarePlanMapper {
  static toDomain(row: PrismaCarePlanWithPrices): CarePlan {
    return CarePlan.rehydrate(row.id, {
      type: CarePlanMapper.TO_DOMAIN_TYPE[row.type],
      name: row.name,
      description: row.description,
      billingModel: CarePlanMapper.TO_DOMAIN_BILLING[row.billingModel],
      allowedHours: [...row.allowedHours],
      active: row.active,
      prices: row.prices.map((price) => {
        const currency = CarePlanMapper.TO_DOMAIN_CURRENCY[price.currency];
        return CarePlanPrice.create(
          currency,
          Money.fromMinor(price.unitAmountMinor, currency),
          Money.fromMinor(price.serviceFeeMinor, currency),
        );
      }),
    });
  }

  static toPrismaType(type: CarePlanType): PrismaCarePlanType {
    return CarePlanMapper.TO_PERSISTENCE_TYPE[type];
  }

  private static readonly TO_DOMAIN_TYPE: Record<PrismaCarePlanType, CarePlanType> = {
    FLEXIBLE: CarePlanType.Flexible,
    STANDARD_MONTHLY: CarePlanType.StandardMonthly,
    PREMIUM: CarePlanType.Premium,
    LIVE_IN: CarePlanType.LiveIn,
  };

  private static readonly TO_PERSISTENCE_TYPE: Record<CarePlanType, PrismaCarePlanType> = {
    [CarePlanType.Flexible]: 'FLEXIBLE',
    [CarePlanType.StandardMonthly]: 'STANDARD_MONTHLY',
    [CarePlanType.Premium]: 'PREMIUM',
    [CarePlanType.LiveIn]: 'LIVE_IN',
  };

  private static readonly TO_DOMAIN_BILLING: Record<PrismaBillingModel, BillingModel> = {
    HOURLY: BillingModel.Hourly,
    MONTHLY: BillingModel.Monthly,
  };

  private static readonly TO_DOMAIN_CURRENCY: Record<PrismaCurrency, Currency> = {
    USD: Currency.UnitedStatesDollar,
    NGN: Currency.NigerianNaira,
  };
}
