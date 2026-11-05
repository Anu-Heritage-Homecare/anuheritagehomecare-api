import { Inject, Injectable } from '@nestjs/common';
import { Currency } from '@shared/domain/currency.enum';
import { BillingSettings, BillingSettingsPatch } from '../../domain/billing-settings.entity';
import {
  BILLING_SETTINGS_REPOSITORY,
  BillingSettingsRepository,
} from '../../domain/billing-settings.repository';
import { BillingSettingsResult, toBillingSettingsResult } from '../dto/billing-settings.result';
import { resolveAllPaymentMethods } from './get-billing-settings.use-case';

export interface UpdateBillingSettingsCommand {
  defaultPaymentTermsDays?: number;
  invoicePrefix?: string;
  defaultCurrency?: Currency;
  standardTaxRatePercent?: number;
  autoNumbering?: boolean;
  autoSendInvoices?: boolean;
  paymentReminders?: boolean;
  reminderDaysBefore?: number;
  overdueNotifications?: boolean;
  overdueNoticeDaysAfter?: number;
  autoReceipts?: boolean;
  emailNotifications?: boolean;
  smsNotifications?: boolean;
  inAppNotifications?: boolean;
}

/** Save the invoice, automation and notification preferences (the settings singleton). */
@Injectable()
export class UpdateBillingSettingsUseCase {
  constructor(
    @Inject(BILLING_SETTINGS_REPOSITORY) private readonly repo: BillingSettingsRepository,
  ) {}

  async execute(command: UpdateBillingSettingsCommand): Promise<BillingSettingsResult> {
    const settings = (await this.repo.load()) ?? BillingSettings.createDefault();
    settings.apply(toPatch(command));
    await this.repo.save(settings);

    const methods = await resolveAllPaymentMethods(this.repo);
    return toBillingSettingsResult(settings, methods);
  }
}

/** Map the command to a domain patch, converting the tax rate from percent to basis points. */
function toPatch(command: UpdateBillingSettingsCommand): BillingSettingsPatch {
  const { standardTaxRatePercent, ...rest } = command;
  const patch: BillingSettingsPatch = { ...rest };
  if (standardTaxRatePercent !== undefined) {
    patch.standardTaxRateBasisPoints = Math.round(standardTaxRatePercent * 100);
  }
  return patch;
}
