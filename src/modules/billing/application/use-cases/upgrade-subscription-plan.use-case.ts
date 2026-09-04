import { Inject, Injectable } from '@nestjs/common';
import { Currency } from '@shared/domain/currency.enum';
import { NotFoundDomainException, ValidationException } from '@shared/domain/domain-exception';
import { ChangeSubscriptionPlanUseCase } from '@modules/bookings/application/use-cases/change-subscription-plan.use-case';
import { ChangeProviderSubscriptionPlanUseCase } from '@modules/payments/application/use-cases/change-subscription-plan.use-case';
import {
  PaymentProvider,
  providerForCurrency,
} from '@modules/payments/domain/payment-provider.enum';
import {
  BILLING_PLAN_DIRECTORY,
  BILLING_SUBSCRIPTION_DIRECTORY,
  BillingPlanDirectory,
  BillingSubscriptionDirectory,
} from '../ports/billing-directories.port';

export interface UpgradeSubscriptionPlanCommand {
  ownerId: string;
  subscriptionId: string;
  planType: string;
}

export interface UpgradedPlanResult {
  subscriptionId: string;
  planType: string;
  planName: string | null;
  currency: string;
  monthlyPriceMinor: number;
}

/**
 * Use case: change a subscription's plan tier (the Upgrade Plan action). Billing
 * resolves the target plan's price server side, moves the subscription onto the
 * new plan at the payment provider and then updates our subscription record, so
 * the two stay in step. Owner scoped. Paystack subscriptions cannot change plan in
 * place yet, so upgrades are limited to the Stripe market for now.
 */
@Injectable()
export class UpgradeSubscriptionPlanUseCase {
  constructor(
    @Inject(BILLING_SUBSCRIPTION_DIRECTORY)
    private readonly subscriptions: BillingSubscriptionDirectory,
    @Inject(BILLING_PLAN_DIRECTORY) private readonly plans: BillingPlanDirectory,
    private readonly changeProviderPlan: ChangeProviderSubscriptionPlanUseCase,
    private readonly changeOurPlan: ChangeSubscriptionPlanUseCase,
  ) {}

  async execute(command: UpgradeSubscriptionPlanCommand): Promise<UpgradedPlanResult> {
    const subscription = await this.subscriptions.findById(command.subscriptionId);
    if (subscription === null || subscription.ownerId !== command.ownerId) {
      throw new NotFoundDomainException('Subscription not found');
    }
    if (command.planType === subscription.planType) {
      throw new ValidationException('The subscription is already on this plan');
    }

    const price = await this.plans.priceForType(command.planType, subscription.currency);
    if (price === null) {
      throw new ValidationException('That plan is not available for this subscription');
    }

    const provider = this.providerFor(subscription.currency);
    if (provider !== PaymentProvider.Stripe) {
      throw new ValidationException(
        'Changing your plan online is not available for your region yet; please contact support',
      );
    }
    if (price.stripePriceId === null || price.stripePriceId.length === 0) {
      throw new ValidationException('That plan is not configured for recurring billing yet');
    }

    await this.changeProviderPlan.execute({
      ownerId: command.ownerId,
      subscriptionId: command.subscriptionId,
      newPlanReference: price.stripePriceId,
    });
    await this.changeOurPlan.execute({
      ownerId: command.ownerId,
      subscriptionId: command.subscriptionId,
      planType: command.planType,
      monthlyPriceMinor: price.monthlyPriceMinor,
      currency: subscription.currency,
    });

    const planName = await this.plans.nameForType(command.planType);
    return {
      subscriptionId: command.subscriptionId,
      planType: command.planType,
      planName,
      currency: subscription.currency,
      monthlyPriceMinor: price.monthlyPriceMinor,
    };
  }

  private providerFor(currency: string): PaymentProvider {
    const money = Object.values(Currency).find((value) => String(value) === currency);
    if (money === undefined) {
      throw new ValidationException('Unknown billing currency');
    }
    return providerForCurrency(money);
  }
}
