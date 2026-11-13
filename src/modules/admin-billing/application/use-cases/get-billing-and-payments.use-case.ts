import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { BILLING_TAX_REPOSITORY, BillingTaxRepository } from '../../domain/billing-tax.repository';
import {
  BILLING_PAYMENT_TERM_REPOSITORY,
  BillingPaymentTermRepository,
} from '../../domain/billing-payment-term.repository';
import {
  INVOICE_NUMBER_PREVIEW_PORT,
  InvoiceNumberPreviewPort,
} from '../ports/invoice-number-preview.port';
import {
  BillingAndPaymentsScreenResult,
  toPaymentTermResult,
  toTaxResult,
} from '../dto/billing-and-payments-screen.result';
import { GetBillingSettingsUseCase } from './get-billing-settings.use-case';

/** The whole Billing & Payments settings screen: settings, taxes, terms, next number. */
@Injectable()
export class GetBillingAndPaymentsUseCase {
  constructor(
    private readonly settings: GetBillingSettingsUseCase,
    @Inject(BILLING_TAX_REPOSITORY) private readonly taxes: BillingTaxRepository,
    @Inject(BILLING_PAYMENT_TERM_REPOSITORY)
    private readonly terms: BillingPaymentTermRepository,
    @Inject(INVOICE_NUMBER_PREVIEW_PORT) private readonly preview: InvoiceNumberPreviewPort,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(): Promise<BillingAndPaymentsScreenResult> {
    const [settings, taxes, terms, nextSequence] = await Promise.all([
      this.settings.execute(),
      this.taxes.list(),
      this.terms.list(),
      this.preview.nextSequence(),
    ]);
    const year = this.clock.now().getUTCFullYear();
    return {
      ...settings,
      taxes: taxes.map(toTaxResult),
      paymentTerms: terms.map(toPaymentTermResult),
      // Matches the live invoice numbering (INV-<year>-<sequence padded to 3>).
      nextInvoiceNumber: `${year}-${String(nextSequence).padStart(3, '0')}`,
    };
  }
}
