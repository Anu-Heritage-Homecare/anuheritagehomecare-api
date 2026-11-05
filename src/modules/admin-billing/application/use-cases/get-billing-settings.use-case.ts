import { Inject, Injectable } from '@nestjs/common';
import { ALL_BILLING_PAYMENT_METHOD_KINDS } from '../../domain/billing-payment-method-kind.enum';
import { BillingPaymentMethodSetting } from '../../domain/billing-payment-method.entity';
import { BillingSettings } from '../../domain/billing-settings.entity';
import {
  BILLING_SETTINGS_REPOSITORY,
  BillingSettingsRepository,
} from '../../domain/billing-settings.repository';
import { BillingSettingsResult, toBillingSettingsResult } from '../dto/billing-settings.result';

/** The whole Billing Settings screen: invoice, automation, notification and payment avenues. */
@Injectable()
export class GetBillingSettingsUseCase {
  constructor(
    @Inject(BILLING_SETTINGS_REPOSITORY) private readonly repo: BillingSettingsRepository,
  ) {}

  async execute(): Promise<BillingSettingsResult> {
    const [settings, methods] = await Promise.all([
      this.repo.load(),
      resolveAllPaymentMethods(this.repo),
    ]);
    return toBillingSettingsResult(settings ?? BillingSettings.createDefault(), methods);
  }
}

/** Every known avenue, falling back to its default when it has never been saved. */
export async function resolveAllPaymentMethods(
  repo: BillingSettingsRepository,
): Promise<BillingPaymentMethodSetting[]> {
  const saved = await repo.loadPaymentMethods();
  const byKind = new Map(saved.map((m) => [m.method, m]));
  return ALL_BILLING_PAYMENT_METHOD_KINDS.map(
    (kind) => byKind.get(kind) ?? BillingPaymentMethodSetting.createDefault(kind),
  );
}
