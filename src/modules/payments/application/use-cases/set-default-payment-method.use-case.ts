import { Inject, Injectable } from '@nestjs/common';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import {
  PAYMENT_METHOD_REPOSITORY,
  PaymentMethodRepository,
} from '../../domain/payment-method.repository';
import { PaymentMethodResult, toPaymentMethodResult } from '../dto/payment-method.result';

export interface SetDefaultPaymentMethodCommand {
  ownerId: string;
  methodId: string;
}

/** Use case: make one of the owner's saved cards their default for future charges. */
@Injectable()
export class SetDefaultPaymentMethodUseCase {
  constructor(
    @Inject(PAYMENT_METHOD_REPOSITORY) private readonly methods: PaymentMethodRepository,
  ) {}

  async execute(command: SetDefaultPaymentMethodCommand): Promise<PaymentMethodResult> {
    const method = await this.methods.findById(command.methodId);
    if (method === null || method.ownerId !== command.ownerId) {
      throw new NotFoundDomainException('Payment method not found');
    }

    await this.methods.setDefault(command.ownerId, command.methodId);
    method.makeDefault();
    return toPaymentMethodResult(method);
  }
}
