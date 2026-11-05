import { Inject, Injectable } from '@nestjs/common';
import { Currency as PrismaCurrency } from '@prisma/client';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { Currency } from '@shared/domain/currency.enum';
import { NotFoundDomainException, ValidationException } from '@shared/domain/domain-exception';
import { BillingSettings } from '../../domain/billing-settings.entity';
import {
  BILLING_SETTINGS_REPOSITORY,
  BillingSettingsRepository,
} from '../../domain/billing-settings.repository';
import { InvoiceLineInput, computeInvoiceTotals } from '../../domain/invoice-totals.calculator';
import {
  INVOICE_WRITE_REPOSITORY,
  InvoiceWriteRepository,
  NewInvoiceAdjustmentRow,
  NewInvoiceLine,
} from '../../domain/invoice-write.repository';
import { ComputeInvoiceTotalsCommand } from './compute-invoice-totals.use-case';
import { InvoiceCreatedResult } from '../dto/invoice-created.result';
import { basisPointsToPercent } from '../dto/billing-settings.result';
import {
  BILLABLE_SERVICES_READ_MODEL,
  BillableServicesCatalogReadModel,
} from '../ports/billable-services-read.port';

const DAY_MS = 24 * 60 * 60 * 1000;
const UNIT_LABEL: Record<'HOURLY' | 'SESSION' | 'FIXED', string> = {
  HOURLY: 'hr',
  SESSION: 'sess',
  FIXED: 'flat',
};

export interface CreateInvoiceCommand extends ComputeInvoiceTotalsCommand {
  careRecipientId: string;
  periodStart: Date;
  periodEnd: Date;
  paymentTermsDays: number | null;
  insuranceCoveredMinor: number;
}

/** Raise a recipient invoice from the Create Invoice wizard: the authoritative write. */
@Injectable()
export class CreateInvoiceUseCase {
  constructor(
    @Inject(INVOICE_WRITE_REPOSITORY) private readonly invoices: InvoiceWriteRepository,
    @Inject(BILLABLE_SERVICES_READ_MODEL)
    private readonly catalog: BillableServicesCatalogReadModel,
    @Inject(BILLING_SETTINGS_REPOSITORY) private readonly settings: BillingSettingsRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: CreateInvoiceCommand): Promise<InvoiceCreatedResult> {
    if (command.lines.length === 0) {
      throw new ValidationException('An invoice needs at least one billable service');
    }
    if (command.periodEnd.getTime() < command.periodStart.getTime()) {
      throw new ValidationException('The service period end cannot precede its start');
    }
    if (!(await this.invoices.recipientExists(command.careRecipientId))) {
      throw new NotFoundDomainException('Care recipient not found');
    }

    const prismaCurrency =
      command.currency === Currency.NigerianNaira ? PrismaCurrency.NGN : PrismaCurrency.USD;
    const [services, settings] = await Promise.all([
      this.catalog.list(prismaCurrency),
      this.settings.load(),
    ]);
    const serviceById = new Map(services.map((service) => [service.id, service]));
    const resolved = BillingSettings.createDefault();
    const effectiveSettings = settings ?? resolved;
    const taxRateBasisPoints = effectiveSettings.snapshot().standardTaxRateBasisPoints;
    const paymentTermsDays =
      command.paymentTermsDays ?? effectiveSettings.snapshot().defaultPaymentTermsDays;

    // Snapshot each service line so the invoice is immutable if the catalog later changes.
    const lines: NewInvoiceLine[] = command.lines.map((line, index) => {
      const service = serviceById.get(line.serviceId);
      if (service === undefined || service.rateMinor === null) {
        throw new ValidationException(
          'A selected service is unknown or not priced for this market',
        );
      }
      return {
        serviceName: service.name,
        amountMinor: Math.round(service.rateMinor * line.quantity),
        position: index,
        rateMinor: service.rateMinor,
        quantity: line.quantity,
        unitLabel: UNIT_LABEL[service.unit],
      };
    });

    const calcLines: InvoiceLineInput[] = lines.map((line) => ({
      rateMinor: line.rateMinor,
      quantity: line.quantity,
    }));
    const totals = computeInvoiceTotals({
      lines: calcLines,
      discounts: command.discounts,
      adjustments: command.adjustments,
      taxRateBasisPoints,
    });

    const adjustments: NewInvoiceAdjustmentRow[] = [
      ...totals.discounts.map((discount, index): NewInvoiceAdjustmentRow => ({
        kind: 'DISCOUNT',
        label: discount.label,
        amountMinor: -discount.amountMinor,
        position: index,
      })),
      ...totals.adjustments.map((adjustment, index): NewInvoiceAdjustmentRow => ({
        kind: 'ADJUSTMENT',
        label: adjustment.label,
        amountMinor: adjustment.amountMinor,
        position: totals.discounts.length + index,
      })),
    ];

    const issuedAt = startOfUtcDay(this.clock.now());
    const dueDate = new Date(issuedAt.getTime() + paymentTermsDays * DAY_MS);

    const { id, sequence } = await this.invoices.create({
      careRecipientId: command.careRecipientId,
      periodStart: command.periodStart,
      periodEnd: command.periodEnd,
      servicesLabel: servicesLabel(lines),
      currency: command.currency,
      amountMinor: totals.totalMinor,
      insuranceCoveredMinor: command.insuranceCoveredMinor,
      subtotalMinor: totals.subtotalMinor,
      discountTotalMinor: totals.discountTotalMinor,
      taxMinor: totals.vatMinor,
      taxRateBasisPoints: totals.taxRateBasisPoints,
      issuedAt,
      dueDate,
      lines,
      adjustments,
    });

    return {
      id,
      invoiceNumber: `INV-${issuedAt.getUTCFullYear()}-${String(sequence).padStart(3, '0')}`,
      status: 'PENDING',
      currency: command.currency,
      issueDate: issuedAt.toISOString(),
      dueDate: dueDate.toISOString(),
      periodStart: command.periodStart.toISOString(),
      periodEnd: command.periodEnd.toISOString(),
      subtotalMinor: totals.subtotalMinor,
      discountTotalMinor: totals.discountTotalMinor,
      taxMinor: totals.vatMinor,
      taxRatePercent: basisPointsToPercent(totals.taxRateBasisPoints),
      totalMinor: totals.totalMinor,
    };
  }
}

/** A comma separated summary of the distinct service names, capped at the column width. */
function servicesLabel(lines: NewInvoiceLine[]): string {
  const names = [...new Set(lines.map((line) => line.serviceName))].join(', ');
  return names.length > 300 ? `${names.slice(0, 297)}...` : names;
}

/** Midnight UTC of the given instant, for date only invoice fields. */
function startOfUtcDay(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}
