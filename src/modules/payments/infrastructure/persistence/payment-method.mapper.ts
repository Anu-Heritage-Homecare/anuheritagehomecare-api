import {
  PaymentMethod as PrismaPaymentMethod,
  PaymentProvider as PrismaProvider,
} from '@prisma/client';
import { PaymentMethod } from '../../domain/payment-method.entity';
import { PaymentProvider } from '../../domain/payment-provider.enum';

/** Translates between the Prisma payment method row and the aggregate. */
export class PaymentMethodMapper {
  static toDomain(row: PrismaPaymentMethod): PaymentMethod {
    return PaymentMethod.rehydrate(row.id, {
      ownerId: row.ownerId,
      provider: PaymentMethodMapper.TO_DOMAIN_PROVIDER[row.provider],
      providerCustomerRef: row.providerCustomerRef,
      providerMethodRef: row.providerMethodRef,
      brand: row.brand,
      last4: row.last4,
      expMonth: row.expMonth,
      expYear: row.expYear,
      isDefault: row.isDefault,
      createdAt: row.createdAt,
    });
  }

  static toPersistence(method: PaymentMethod): PrismaPaymentMethod {
    return {
      id: method.id,
      ownerId: method.ownerId,
      provider: PaymentMethodMapper.TO_PERSISTENCE_PROVIDER[method.provider],
      providerCustomerRef: method.providerCustomerRef,
      providerMethodRef: method.providerMethodRef,
      brand: method.brand,
      last4: method.last4,
      expMonth: method.expMonth,
      expYear: method.expYear,
      isDefault: method.isDefault,
      createdAt: method.createdAt,
    };
  }

  private static readonly TO_DOMAIN_PROVIDER: Record<PrismaProvider, PaymentProvider> = {
    STRIPE: PaymentProvider.Stripe,
    PAYSTACK: PaymentProvider.Paystack,
  };

  private static readonly TO_PERSISTENCE_PROVIDER: Record<PaymentProvider, PrismaProvider> = {
    [PaymentProvider.Stripe]: 'STRIPE',
    [PaymentProvider.Paystack]: 'PAYSTACK',
  };
}
