import { Inject, Injectable } from '@nestjs/common';
import { Currency as PrismaCurrency } from '@prisma/client';
import { Currency } from '@shared/domain/currency.enum';
import { ValidationException } from '@shared/domain/domain-exception';
import { BillingSettings } from '../../domain/billing-settings.entity';
import {
  BILLING_SETTINGS_REPOSITORY,
  BillingSettingsRepository,
} from '../../domain/billing-settings.repository';
import {
  DiscountKind,
  InvoiceLineInput,
  computeInvoiceTotals,
} from '../../domain/invoice-totals.calculator';
import { InvoiceTotalsResult } from '../dto/invoice-totals.result';
import { basisPointsToPercent } from '../dto/billing-settings.result';
import {
  BILLABLE_SERVICES_READ_MODEL,
  BillableServicesCatalogReadModel,
} from '../ports/billable-services-read.port';

export interface ComputeInvoiceTotalsCommand {
  currency: Currency;
  lines: {
    serviceId: string;
    quantity: number;
    serviceDateStart?: string;
    serviceDateEnd?: string;
    caregiverId?: string;
  }[];
  discounts: { label: string; kind: DiscountKind; value: number }[];
  adjustments: { label: string; amountMinor: number }[];
}

/** Compute the authoritative invoice totals from the selected services, discounts and tax. */
@Injectable()
export class ComputeInvoiceTotalsUseCase {
  constructor(
    @Inject(BILLABLE_SERVICES_READ_MODEL)
    private readonly catalog: BillableServicesCatalogReadModel,
    @Inject(BILLING_SETTINGS_REPOSITORY)
    private readonly settings: BillingSettingsRepository,
  ) {}

  async execute(command: ComputeInvoiceTotalsCommand): Promise<InvoiceTotalsResult> {
    const prismaCurrency =
      command.currency === Currency.NigerianNaira ? PrismaCurrency.NGN : PrismaCurrency.USD;
    const [services, settings] = await Promise.all([
      this.catalog.list(prismaCurrency),
      this.settings.load(),
    ]);
    const rateByService = new Map(services.map((service) => [service.id, service.rateMinor]));

    const lines: InvoiceLineInput[] = command.lines.map((line) => {
      const rateMinor = rateByService.get(line.serviceId);
      if (rateMinor === undefined || rateMinor === null) {
        throw new ValidationException(
          'A selected service is unknown or not priced for this market',
        );
      }
      return { rateMinor, quantity: line.quantity };
    });

    const taxRateBasisPoints = (settings ?? BillingSettings.createDefault()).snapshot()
      .standardTaxRateBasisPoints;
    const totals = computeInvoiceTotals({
      lines,
      discounts: command.discounts,
      adjustments: command.adjustments,
      taxRateBasisPoints,
    });

    return {
      currency: command.currency,
      subtotalMinor: totals.subtotalMinor,
      discounts: totals.discounts,
      discountTotalMinor: totals.discountTotalMinor,
      adjustments: totals.adjustments,
      adjustmentTotalMinor: totals.adjustmentTotalMinor,
      taxableBaseMinor: totals.taxableBaseMinor,
      taxRatePercent: basisPointsToPercent(totals.taxRateBasisPoints),
      vatMinor: totals.vatMinor,
      totalMinor: totals.totalMinor,
    };
  }
}
