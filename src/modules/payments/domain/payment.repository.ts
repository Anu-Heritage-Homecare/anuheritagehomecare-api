import { Payment } from './payment.entity';

/** Persistence port for the Payment aggregate. */
export interface PaymentRepository {
  save(payment: Payment): Promise<void>;
  findById(id: string): Promise<Payment | null>;
  findByProviderReference(providerReference: string): Promise<Payment | null>;
  listByOwner(ownerId: string): Promise<Payment[]>;
}

export const PAYMENT_REPOSITORY = Symbol('PAYMENT_REPOSITORY');
