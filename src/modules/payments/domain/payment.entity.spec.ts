import { Currency } from '@shared/domain/currency.enum';
import { Money } from '@shared/domain/money.vo';
import { PayableType } from './payable-type.enum';
import { Payment } from './payment.entity';
import { PaymentProvider } from './payment-provider.enum';
import { PaymentStatus } from './payment-status.enum';

const NOW = new Date('2026-01-01T00:00:00.000Z');

function pending(): Payment {
  return Payment.initiate({
    id: 'pay-1',
    ownerId: 'owner-1',
    payableType: PayableType.Booking,
    payableId: 'booking-1',
    provider: PaymentProvider.Stripe,
    providerReference: 'prov_1',
    amount: Money.fromMinor(19000, Currency.UnitedStatesDollar),
    now: NOW,
  });
}

describe('Payment', () => {
  it('starts pending and settles to succeeded once', () => {
    const payment = pending();
    expect(payment.status).toBe(PaymentStatus.Pending);

    payment.markSucceeded(NOW);
    expect(payment.status).toBe(PaymentStatus.Succeeded);
    expect(payment.isSettled).toBe(true);
  });

  it('does not overwrite a settled outcome', () => {
    const payment = pending();
    payment.markSucceeded(NOW);
    payment.markFailed(NOW);

    expect(payment.status).toBe(PaymentStatus.Succeeded);
  });
});
