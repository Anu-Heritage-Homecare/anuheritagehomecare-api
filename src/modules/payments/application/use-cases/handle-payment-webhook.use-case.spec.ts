import { Currency } from '@shared/domain/currency.enum';
import { Money } from '@shared/domain/money.vo';
import { PayableType } from '../../domain/payable-type.enum';
import { Payment } from '../../domain/payment.entity';
import { PaymentProvider } from '../../domain/payment-provider.enum';
import { PaymentStatus } from '../../domain/payment-status.enum';
import {
  FakePayableService,
  FakePaymentGateway,
  InMemoryPaymentRepository,
  fixedClock,
} from '../../test-support/doubles';
import { HandlePaymentWebhookUseCase } from './handle-payment-webhook.use-case';

describe('HandlePaymentWebhookUseCase', () => {
  let payments: InMemoryPaymentRepository;
  let payables: FakePayableService;
  let useCase: HandlePaymentWebhookUseCase;

  beforeEach(async () => {
    payments = new InMemoryPaymentRepository();
    payables = new FakePayableService(new Map());
    useCase = new HandlePaymentWebhookUseCase(
      payments,
      payables,
      new FakePaymentGateway(),
      fixedClock,
    );

    await payments.save(
      Payment.initiate({
        id: 'pay-1',
        ownerId: 'owner-1',
        payableType: PayableType.Booking,
        payableId: 'booking-1',
        provider: PaymentProvider.Stripe,
        providerReference: 'prov_pay-1',
        amount: Money.fromMinor(19000, Currency.UnitedStatesDollar),
        now: fixedClock.now(),
      }),
    );
  });

  const body = (outcome: string): string =>
    JSON.stringify({ providerReference: 'prov_pay-1', outcome });

  it('confirms the payable on a verified success', async () => {
    await useCase.execute({
      provider: PaymentProvider.Stripe,
      rawBody: body('succeeded'),
      signature: 'valid',
    });

    expect((await payments.findById('pay-1'))?.status).toBe(PaymentStatus.Succeeded);
    expect(payables.paid.has('BOOKING:booking-1')).toBe(true);
  });

  it('rejects a webhook with a bad signature', async () => {
    await expect(
      useCase.execute({
        provider: PaymentProvider.Stripe,
        rawBody: body('succeeded'),
        signature: 'forged',
      }),
    ).rejects.toThrow();
    expect(payables.paid.size).toBe(0);
  });

  it('ignores an unknown provider reference', async () => {
    await useCase.execute({
      provider: PaymentProvider.Stripe,
      rawBody: JSON.stringify({ providerReference: 'prov_unknown', outcome: 'succeeded' }),
      signature: 'valid',
    });

    expect((await payments.findById('pay-1'))?.status).toBe(PaymentStatus.Pending);
  });

  it('does not double confirm when the payment is already settled', async () => {
    await useCase.execute({
      provider: PaymentProvider.Stripe,
      rawBody: body('succeeded'),
      signature: 'valid',
    });
    payables.paid.clear();

    await useCase.execute({
      provider: PaymentProvider.Stripe,
      rawBody: body('succeeded'),
      signature: 'valid',
    });

    expect(payables.paid.size).toBe(0);
  });
});
