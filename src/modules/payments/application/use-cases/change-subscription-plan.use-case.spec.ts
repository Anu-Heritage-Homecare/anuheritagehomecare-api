import { Currency } from '@shared/domain/currency.enum';
import { Money } from '@shared/domain/money.vo';
import { PayableType } from '../../domain/payable-type.enum';
import { Payment } from '../../domain/payment.entity';
import { PaymentProvider } from '../../domain/payment-provider.enum';
import {
  FakePaymentGateway,
  InMemoryPaymentRepository,
  fixedClock,
} from '../../test-support/doubles';
import { ChangeProviderSubscriptionPlanUseCase } from './change-subscription-plan.use-case';

describe('ChangeProviderSubscriptionPlanUseCase', () => {
  let payments: InMemoryPaymentRepository;
  let gateway: FakePaymentGateway;
  let useCase: ChangeProviderSubscriptionPlanUseCase;

  beforeEach(() => {
    payments = new InMemoryPaymentRepository();
    gateway = new FakePaymentGateway();
    useCase = new ChangeProviderSubscriptionPlanUseCase(payments, gateway);
  });

  function subscriptionPayment(): Payment {
    const payment = Payment.initiate({
      id: 'pay-1',
      ownerId: 'owner-1',
      payableType: PayableType.Subscription,
      payableId: 'sub-1',
      provider: PaymentProvider.Stripe,
      providerReference: 'sub_stripe_live',
      amount: Money.fromMinor(120_000, Currency.UnitedStatesDollar),
      now: fixedClock.now(),
    });
    payment.markSucceeded(fixedClock.now());
    return payment;
  }

  it('changes the plan on the provider subscription from the settling payment', async () => {
    await payments.save(subscriptionPayment());

    await useCase.execute({
      ownerId: 'owner-1',
      subscriptionId: 'sub-1',
      newPlanReference: 'price_premium',
    });

    expect(gateway.planChanges).toEqual([
      {
        provider: PaymentProvider.Stripe,
        providerSubscriptionRef: 'sub_stripe_live',
        newPlanReference: 'price_premium',
      },
    ]);
  });

  it('throws when no provider subscription exists for the plan', async () => {
    await expect(
      useCase.execute({ ownerId: 'owner-1', subscriptionId: 'sub-1', newPlanReference: 'price_x' }),
    ).rejects.toThrow();
    expect(gateway.planChanges).toHaveLength(0);
  });
});
