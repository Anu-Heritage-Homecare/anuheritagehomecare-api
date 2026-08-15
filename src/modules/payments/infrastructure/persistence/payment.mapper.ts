import {
  Currency as PrismaCurrency,
  Payment as PrismaPayment,
  PayableType as PrismaPayableType,
  PaymentProvider as PrismaProvider,
  PaymentStatus as PrismaStatus,
} from '@prisma/client';
import { Currency } from '@shared/domain/currency.enum';
import { Money } from '@shared/domain/money.vo';
import { PayableType } from '../../domain/payable-type.enum';
import { Payment } from '../../domain/payment.entity';
import { PaymentProvider } from '../../domain/payment-provider.enum';
import { PaymentStatus } from '../../domain/payment-status.enum';

/** Translates between the Prisma payment row and the Payment aggregate. */
export class PaymentMapper {
  static toDomain(row: PrismaPayment): Payment {
    const currency = PaymentMapper.TO_DOMAIN_CURRENCY[row.currency];
    return Payment.rehydrate(row.id, {
      ownerId: row.ownerId,
      payableType: PaymentMapper.TO_DOMAIN_PAYABLE[row.payableType],
      payableId: row.payableId,
      provider: PaymentMapper.TO_DOMAIN_PROVIDER[row.provider],
      providerReference: row.providerReference,
      amount: Money.fromMinor(row.amountMinor, currency),
      status: PaymentMapper.TO_DOMAIN_STATUS[row.status],
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  static toPersistence(payment: Payment): PrismaPayment {
    return {
      id: payment.id,
      ownerId: payment.ownerId,
      payableType: PaymentMapper.TO_PERSISTENCE_PAYABLE[payment.payableType],
      payableId: payment.payableId,
      provider: PaymentMapper.TO_PERSISTENCE_PROVIDER[payment.provider],
      providerReference: payment.providerReference,
      currency: PaymentMapper.TO_PERSISTENCE_CURRENCY[payment.amount.currency],
      amountMinor: payment.amount.amountMinor,
      status: PaymentMapper.TO_PERSISTENCE_STATUS[payment.status],
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
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

  private static readonly TO_DOMAIN_PROVIDER: Record<PrismaProvider, PaymentProvider> = {
    STRIPE: PaymentProvider.Stripe,
    PAYSTACK: PaymentProvider.Paystack,
  };

  private static readonly TO_PERSISTENCE_PROVIDER: Record<PaymentProvider, PrismaProvider> = {
    [PaymentProvider.Stripe]: 'STRIPE',
    [PaymentProvider.Paystack]: 'PAYSTACK',
  };

  private static readonly TO_DOMAIN_STATUS: Record<PrismaStatus, PaymentStatus> = {
    PENDING: PaymentStatus.Pending,
    SUCCEEDED: PaymentStatus.Succeeded,
    FAILED: PaymentStatus.Failed,
  };

  private static readonly TO_PERSISTENCE_STATUS: Record<PaymentStatus, PrismaStatus> = {
    [PaymentStatus.Pending]: 'PENDING',
    [PaymentStatus.Succeeded]: 'SUCCEEDED',
    [PaymentStatus.Failed]: 'FAILED',
  };

  private static readonly TO_DOMAIN_PAYABLE: Record<PrismaPayableType, PayableType> = {
    BOOKING: PayableType.Booking,
    SUBSCRIPTION: PayableType.Subscription,
  };

  private static readonly TO_PERSISTENCE_PAYABLE: Record<PayableType, PrismaPayableType> = {
    [PayableType.Booking]: 'BOOKING',
    [PayableType.Subscription]: 'SUBSCRIPTION',
  };
}
