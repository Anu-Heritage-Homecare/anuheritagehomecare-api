import { Currency } from '@shared/domain/currency.enum';
import { CarePlanType } from '@modules/care-plans/domain/care-plan-type.enum';
import { Subscription } from '../../domain/subscription.entity';
import { SubscriptionStatus } from '../../domain/subscription-status.enum';

export interface SubscriptionResult {
  id: string;
  ownerId: string;
  careRecipientId: string;
  planType: CarePlanType;
  status: SubscriptionStatus;
  startDate: string;
  currency: Currency;
  monthlyPriceMinor: number;
  createdAt: string;
  updatedAt: string;
}

export function toSubscriptionResult(subscription: Subscription): SubscriptionResult {
  return {
    id: subscription.id,
    ownerId: subscription.ownerId,
    careRecipientId: subscription.careRecipientId,
    planType: subscription.planType,
    status: subscription.status,
    startDate: subscription.startDate.toISOString().slice(0, 10),
    currency: subscription.monthlyPrice.currency,
    monthlyPriceMinor: subscription.monthlyPrice.amountMinor,
    createdAt: subscription.createdAt.toISOString(),
    updatedAt: subscription.updatedAt.toISOString(),
  };
}
