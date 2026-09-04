import { PaymentMethod } from './payment-method.entity';

/** Persistence port for saved payment methods. */
export interface PaymentMethodRepository {
  save(method: PaymentMethod): Promise<void>;
  findById(id: string): Promise<PaymentMethod | null>;
  listByOwner(ownerId: string): Promise<PaymentMethod[]>;
  /** Owner scoped delete; a no op if the id does not belong to the owner. */
  delete(ownerId: string, id: string): Promise<void>;
  /** Make one method the owner's default, clearing the flag on their others. */
  setDefault(ownerId: string, id: string): Promise<void>;
}

export const PAYMENT_METHOD_REPOSITORY = Symbol('PAYMENT_METHOD_REPOSITORY');
