import {
  CarePlanType as PrismaCarePlanType,
  Currency as PrismaCurrency,
  Subscription as PrismaSubscription,
  SubscriptionStatus as PrismaSubscriptionStatus,
} from '@prisma/client';
import { Currency } from '@shared/domain/currency.enum';
import { Money } from '@shared/domain/money.vo';
import { CarePlanType } from '@modules/care-plans/domain/care-plan-type.enum';
import { Subscription } from '../../domain/subscription.entity';
import { SubscriptionStatus } from '../../domain/subscription-status.enum';

/** Translates between the Prisma subscription row and the Subscription aggregate. */
export class SubscriptionMapper {
  static toDomain(row: PrismaSubscription): Subscription {
    const currency = SubscriptionMapper.TO_DOMAIN_CURRENCY[row.currency];
    return Subscription.rehydrate(row.id, {
      ownerId: row.ownerId,
      careRecipientId: row.careRecipientId,
      planType: SubscriptionMapper.TO_DOMAIN_PLAN[row.planType],
      startDate: row.startDate,
      monthlyPrice: Money.fromMinor(row.monthlyPriceMinor, currency),
      status: SubscriptionMapper.TO_DOMAIN_STATUS[row.status],
      autoRenew: row.autoRenew,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  static toPersistence(subscription: Subscription): PrismaSubscription {
    return {
      id: subscription.id,
      ownerId: subscription.ownerId,
      careRecipientId: subscription.careRecipientId,
      planType: SubscriptionMapper.TO_PERSISTENCE_PLAN[subscription.planType],
      startDate: subscription.startDate,
      currency: SubscriptionMapper.TO_PERSISTENCE_CURRENCY[subscription.monthlyPrice.currency],
      monthlyPriceMinor: subscription.monthlyPrice.amountMinor,
      status: SubscriptionMapper.TO_PERSISTENCE_STATUS[subscription.status],
      autoRenew: subscription.autoRenew,
      createdAt: subscription.createdAt,
      updatedAt: subscription.updatedAt,
    };
  }

  private static readonly TO_DOMAIN_CURRENCY: Record<PrismaCurrency, Currency> = {
    USD: Currency.UnitedStatesDollar,
    NGN: Currency.NigerianNaira,
  };

  private static readonly TO_PERSISTENCE_CURRENCY: Record<Currency, PrismaCurrency> = {
    [Currency.UnitedStatesDollar]: 'USD',
    [Currency.NigerianNaira]: 'NGN',
  };

  private static readonly TO_DOMAIN_PLAN: Record<PrismaCarePlanType, CarePlanType> = {
    FLEXIBLE: CarePlanType.Flexible,
    STANDARD_MONTHLY: CarePlanType.StandardMonthly,
    PREMIUM: CarePlanType.Premium,
    LIVE_IN: CarePlanType.LiveIn,
  };

  private static readonly TO_PERSISTENCE_PLAN: Record<CarePlanType, PrismaCarePlanType> = {
    [CarePlanType.Flexible]: 'FLEXIBLE',
    [CarePlanType.StandardMonthly]: 'STANDARD_MONTHLY',
    [CarePlanType.Premium]: 'PREMIUM',
    [CarePlanType.LiveIn]: 'LIVE_IN',
  };

  private static readonly TO_DOMAIN_STATUS: Record<PrismaSubscriptionStatus, SubscriptionStatus> = {
    PENDING_PAYMENT: SubscriptionStatus.PendingPayment,
    ACTIVE: SubscriptionStatus.Active,
    PAUSED: SubscriptionStatus.Paused,
    PAST_DUE: SubscriptionStatus.PastDue,
    CANCELLED: SubscriptionStatus.Cancelled,
  };

  private static readonly TO_PERSISTENCE_STATUS: Record<
    SubscriptionStatus,
    PrismaSubscriptionStatus
  > = {
    [SubscriptionStatus.PendingPayment]: 'PENDING_PAYMENT',
    [SubscriptionStatus.Active]: 'ACTIVE',
    [SubscriptionStatus.Paused]: 'PAUSED',
    [SubscriptionStatus.PastDue]: 'PAST_DUE',
    [SubscriptionStatus.Cancelled]: 'CANCELLED',
  };
}
