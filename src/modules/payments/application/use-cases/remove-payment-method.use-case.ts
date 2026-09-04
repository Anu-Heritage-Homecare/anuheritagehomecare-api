import { Inject, Injectable } from '@nestjs/common';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import {
  PAYMENT_METHOD_REPOSITORY,
  PaymentMethodRepository,
} from '../../domain/payment-method.repository';

export interface RemovePaymentMethodCommand {
  ownerId: string;
  methodId: string;
}

/**
 * Use case: remove a saved card. Owner scoped, and if the removed card was the
 * default the most recent remaining card is promoted so the owner is never left
 * without a default while they still have a card on file.
 */
@Injectable()
export class RemovePaymentMethodUseCase {
  constructor(
    @Inject(PAYMENT_METHOD_REPOSITORY) private readonly methods: PaymentMethodRepository,
  ) {}

  async execute(command: RemovePaymentMethodCommand): Promise<void> {
    const method = await this.methods.findById(command.methodId);
    if (method === null || method.ownerId !== command.ownerId) {
      throw new NotFoundDomainException('Payment method not found');
    }

    await this.methods.delete(command.ownerId, command.methodId);

    if (method.isDefault) {
      const remaining = await this.methods.listByOwner(command.ownerId);
      if (remaining.length > 0) {
        await this.methods.setDefault(command.ownerId, remaining[0].id);
      }
    }
  }
}
