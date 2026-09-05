import { PaymentMethod } from '../../domain/payment-method.entity';
import { PaymentProvider } from '../../domain/payment-provider.enum';

export interface PaymentMethodResult {
  id: string;
  provider: PaymentProvider;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  cardHolderName: string | null;
  isDefault: boolean;
}

export function toPaymentMethodResult(method: PaymentMethod): PaymentMethodResult {
  return {
    id: method.id,
    provider: method.provider,
    brand: method.brand,
    last4: method.last4,
    expMonth: method.expMonth,
    expYear: method.expYear,
    cardHolderName: method.cardHolderName,
    isDefault: method.isDefault,
  };
}
