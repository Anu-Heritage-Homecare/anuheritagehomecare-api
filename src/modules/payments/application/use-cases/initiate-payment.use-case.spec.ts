import { Currency } from '@shared/domain/currency.enum';
import { NotFoundDomainException, ValidationException } from '@shared/domain/domain-exception';
import { PayableType } from '../../domain/payable-type.enum';
import { PaymentProvider } from '../../domain/payment-provider.enum';
import { PaymentStatus } from '../../domain/payment-status.enum';
import { PayableSummary } from '../ports/payable-service.port';
import {
  FakePayableService,
  FakePaymentGateway,
  InMemoryPaymentRepository,
  fixedClock,
  sequentialIds,
} from '../../test-support/doubles';
import { InitiatePaymentUseCase } from './initiate-payment.use-case';

describe('InitiatePaymentUseCase', () => {
  let payments: InMemoryPaymentRepository;
  let payables: FakePayableService;
  let useCase: InitiatePaymentUseCase;

  const booking: PayableSummary = {
    ownerId: 'owner-1',
    currency: Currency.UnitedStatesDollar,
    amountMinor: 19000,
    alreadyPaid: false,
  };

  beforeEach(() => {
    payments = new InMemoryPaymentRepository();
    payables = new FakePayableService(new Map([['BOOKING:booking-1', booking]]));
    useCase = new InitiatePaymentUseCase(
      payments,
      payables,
      new FakePaymentGateway(),
      fixedClock,
      sequentialIds('pay'),
    );
  });

  const command = {
    ownerId: 'owner-1',
    ownerEmail: 'ada.obi@example.com',
    payableType: PayableType.Booking,
    payableId: 'booking-1',
  };

  it('records a pending payment through the currency matched provider', async () => {
    const result = await useCase.execute(command);

    expect(result.provider).toBe(PaymentProvider.Stripe);
    expect(result.status).toBe(PaymentStatus.Pending);
    expect(result.amountMinor).toBe(19000);
    expect(result.clientSecret).toBe('cs_pay-1');
    expect(payments.store.size).toBe(1);
  });

  it('rejects paying for something that does not exist or is not owned', async () => {
    await expect(useCase.execute({ ...command, payableId: 'missing' })).rejects.toBeInstanceOf(
      NotFoundDomainException,
    );
    await expect(useCase.execute({ ...command, ownerId: 'intruder' })).rejects.toBeInstanceOf(
      NotFoundDomainException,
    );
  });

  it('rejects paying twice', async () => {
    payables = new FakePayableService(
      new Map([['BOOKING:booking-1', { ...booking, alreadyPaid: true }]]),
    );
    useCase = new InitiatePaymentUseCase(
      payments,
      payables,
      new FakePaymentGateway(),
      fixedClock,
      sequentialIds('pay'),
    );

    await expect(useCase.execute(command)).rejects.toBeInstanceOf(ValidationException);
  });
});
