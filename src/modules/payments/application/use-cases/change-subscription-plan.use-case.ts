import { Inject, Injectable } from '@nestjs/common';
import { ValidationException } from '@shared/domain/domain-exception';
import { PayableType } from '../../domain/payable-type.enum';
import { PAYMENT_REPOSITORY, PaymentRepository } from '../../domain/payment.repository';
import { PAYMENT_GATEWAY, PaymentGateway } from '../ports/payment-gateway.port';

export interface ChangeProviderSubscriptionPlanCommand {
  ownerId: string;
  subscriptionId: string;
  /** The new recurring price (Stripe) or plan code (Paystack) at the provider. */
  newPlanReference: string;
}

/**
 * Use case: move a subscription onto a new plan at the payment provider. The
 * provider subscription reference and the provider itself are read from the
 * payment that started the subscription, so the caller (billing) does not need to
 * know either. Exported for the billing context to call as part of a plan upgrade.
 */
@Injectable()
export class ChangeProviderSubscriptionPlanUseCase {
  constructor(
    @Inject(PAYMENT_REPOSITORY) private readonly payments: PaymentRepository,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGateway,
  ) {}

  async execute(command: ChangeProviderSubscriptionPlanCommand): Promise<void> {
    const owned = await this.payments.listByOwner(command.ownerId);
    const forSubscription = owned
      .filter(
        (payment) =>
          payment.payableType === PayableType.Subscription &&
          payment.payableId === command.subscriptionId,
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    // Prefer the settled charge (its reference is the live provider subscription).
    const initiating = forSubscription.find((payment) => payment.isSettled) ?? forSubscription[0];
    if (initiating === undefined) {
      throw new ValidationException('No provider subscription was found for this plan');
    }

    await this.gateway.changeSubscriptionPlan({
      provider: initiating.provider,
      providerSubscriptionRef: initiating.providerReference,
      newPlanReference: command.newPlanReference,
    });
  }
}
