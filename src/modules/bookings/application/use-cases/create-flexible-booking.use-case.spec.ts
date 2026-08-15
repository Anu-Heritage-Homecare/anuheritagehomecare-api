import { Currency } from '@shared/domain/currency.enum';
import { NotFoundDomainException, ValidationException } from '@shared/domain/domain-exception';
import { BookingStatus } from '../../domain/booking-status.enum';
import {
  FakeCarePlanRepository,
  FakeCareRecipientAccess,
  InMemoryBookingRepository,
  fakeBookingConfig,
  fixedClock,
  sequentialIds,
} from '../../test-support/doubles';
import { CreateFlexibleBookingCommand } from '../commands/create-flexible-booking.command';
import { CreateFlexibleBookingUseCase } from './create-flexible-booking.use-case';

describe('CreateFlexibleBookingUseCase', () => {
  let bookings: InMemoryBookingRepository;
  let useCase: CreateFlexibleBookingUseCase;

  const command: CreateFlexibleBookingCommand = {
    ownerId: 'owner-1',
    currency: Currency.UnitedStatesDollar,
    careRecipientId: 'recipient-1',
    hours: 6,
    serviceDate: '2026-07-28',
    startTime: '09:00',
  };

  beforeEach(() => {
    bookings = new InMemoryBookingRepository();
    useCase = new CreateFlexibleBookingUseCase(
      bookings,
      new FakeCarePlanRepository(),
      new FakeCareRecipientAccess(),
      fixedClock,
      sequentialIds('booking'),
      fakeBookingConfig(),
    );
  });

  it('prices the booking server side and stores it awaiting payment', async () => {
    const result = await useCase.execute(command);

    expect(result.status).toBe(BookingStatus.PendingPayment);
    expect(result.price.hourlyRateMinor).toBe(3000);
    expect(result.price.subtotalMinor).toBe(18000);
    expect(result.price.serviceFeeMinor).toBe(1000);
    expect(result.price.totalMinor).toBe(19000);
    expect(result.endTime).toBe('15:00');
    expect(bookings.store.size).toBe(1);
  });

  it('rejects an hours choice the plan does not offer', async () => {
    await expect(useCase.execute({ ...command, hours: 5 })).rejects.toBeInstanceOf(
      ValidationException,
    );
  });

  it('rejects a date and time in the past', async () => {
    await expect(useCase.execute({ ...command, serviceDate: '2020-01-01' })).rejects.toBeInstanceOf(
      ValidationException,
    );
  });

  it('rejects booking for a care recipient the owner cannot access', async () => {
    await expect(
      useCase.execute({ ...command, careRecipientId: 'someone-else' }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});
