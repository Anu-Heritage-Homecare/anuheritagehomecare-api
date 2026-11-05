import { Inject, Injectable } from '@nestjs/common';
import { BillingPaymentMethodKind } from '../../domain/billing-payment-method-kind.enum';
import { BillingPaymentMethodSetting } from '../../domain/billing-payment-method.entity';
import {
  BILLING_SETTINGS_REPOSITORY,
  BillingSettingsRepository,
} from '../../domain/billing-settings.repository';
import { BillingPaymentMethodResult, toPaymentMethodResult } from '../dto/billing-settings.result';

export interface UpdatePaymentMethodCommand {
  method: BillingPaymentMethodKind;
  enabled?: boolean;
  description?: string;
}

/** Enable, disable or re describe one payment avenue (the per method Edit action). */
@Injectable()
export class UpdatePaymentMethodUseCase {
  constructor(
    @Inject(BILLING_SETTINGS_REPOSITORY) private readonly repo: BillingSettingsRepository,
  ) {}

  async execute(command: UpdatePaymentMethodCommand): Promise<BillingPaymentMethodResult> {
    const method =
      (await this.repo.loadPaymentMethod(command.method)) ??
      BillingPaymentMethodSetting.createDefault(command.method);
    method.apply({ enabled: command.enabled, description: command.description });
    await this.repo.savePaymentMethod(method);
    return toPaymentMethodResult(method);
  }
}
