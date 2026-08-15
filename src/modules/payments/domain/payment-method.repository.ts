import { PaymentMethod } from './payment-method.entity';

/** Persistence port for saved payment methods. */
export interface PaymentMethodRepository {
  save(method: PaymentMethod): Promise<void>;
  listByOwner(ownerId: string): Promise<PaymentMethod[]>;
}

export const PAYMENT_METHOD_REPOSITORY = Symbol('PAYMENT_METHOD_REPOSITORY');
