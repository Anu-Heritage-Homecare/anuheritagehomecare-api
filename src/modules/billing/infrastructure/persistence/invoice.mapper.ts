import {
  Currency as PrismaCurrency,
  Invoice as PrismaInvoice,
  InvoiceStatus as PrismaInvoiceStatus,
} from '@prisma/client';
import { Currency } from '@shared/domain/currency.enum';
import { Invoice } from '../../domain/invoice.entity';
import { InvoiceStatus } from '../../domain/invoice-status.enum';

/**
 * Translates between the Prisma Invoice row and the aggregate. The only place
 * that knows both shapes, so the domain stays free of Prisma types.
 */
export class InvoiceMapper {
  static toDomain(row: PrismaInvoice): Invoice {
    return Invoice.rehydrate(row.id, {
      ownerId: row.ownerId,
      careRecipientId: row.careRecipientId,
      subscriptionId: row.subscriptionId,
      number: row.number,
      currency: InvoiceMapper.TO_DOMAIN_CURRENCY[row.currency],
      amountMinor: row.amountMinor,
      periodStart: row.periodStart,
      periodEnd: row.periodEnd,
      dueDate: row.dueDate,
      status: InvoiceMapper.TO_DOMAIN_STATUS[row.status],
      issuedAt: row.issuedAt,
      paidAt: row.paidAt,
    });
  }

  static toPersistence(invoice: Invoice): PrismaInvoice {
    return {
      id: invoice.id,
      ownerId: invoice.ownerId,
      careRecipientId: invoice.careRecipientId,
      subscriptionId: invoice.subscriptionId,
      number: invoice.number,
      currency: InvoiceMapper.TO_PERSISTENCE_CURRENCY[invoice.currency],
      amountMinor: invoice.amountMinor,
      periodStart: invoice.periodStart,
      periodEnd: invoice.periodEnd,
      dueDate: invoice.dueDate,
      status: InvoiceMapper.TO_PERSISTENCE_STATUS[invoice.status],
      issuedAt: invoice.issuedAt,
      paidAt: invoice.paidAt,
    };
  }

  private static readonly TO_DOMAIN_CURRENCY: Record<PrismaCurrency, Currency> = {
    USD: Currency.UnitedStatesDollar,
    NGN: Currency.NigerianNaira,
  };

  private static readonly TO_PERSISTENCE_CURRENCY: Record<Currency, PrismaCurrency> = {
    [Currency.UnitedStatesDollar]: 'USD',
    [Currency.NigerianNaira]: 'NGN',
  };

  private static readonly TO_DOMAIN_STATUS: Record<PrismaInvoiceStatus, InvoiceStatus> = {
    ISSUED: InvoiceStatus.Issued,
    PAID: InvoiceStatus.Paid,
    VOID: InvoiceStatus.Void,
  };

  private static readonly TO_PERSISTENCE_STATUS: Record<InvoiceStatus, PrismaInvoiceStatus> = {
    [InvoiceStatus.Issued]: 'ISSUED',
    [InvoiceStatus.Paid]: 'PAID',
    [InvoiceStatus.Void]: 'VOID',
  };
}
