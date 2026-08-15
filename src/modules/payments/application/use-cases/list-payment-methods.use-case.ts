import { Inject, Injectable } from '@nestjs/common';
import {
  PAYMENT_METHOD_REPOSITORY,
  PaymentMethodRepository,
} from '../../domain/payment-method.repository';
import { PaymentMethodResult, toPaymentMethodResult } from '../dto/payment-method.result';

/** Use case: list the owner's saved payment methods. */
@Injectable()
export class ListPaymentMethodsUseCase {
  constructor(
    @Inject(PAYMENT_METHOD_REPOSITORY) private readonly methods: PaymentMethodRepository,
  ) {}

  async execute(params: { ownerId: string }): Promise<PaymentMethodResult[]> {
    const methods = await this.methods.listByOwner(params.ownerId);
    return methods.map(toPaymentMethodResult);
  }
}
