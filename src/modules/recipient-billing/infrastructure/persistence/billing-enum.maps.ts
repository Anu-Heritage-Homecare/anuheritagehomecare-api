import {
  Currency as PrismaCurrency,
  RecipientInvoiceStatus as PrismaInvoiceStatus,
} from '@prisma/client';
import { Currency } from '@shared/domain/currency.enum';
import { InvoiceStatus } from '../../domain/invoice-status.enum';

export const TO_DOMAIN_CURRENCY: Record<PrismaCurrency, Currency> = {
  USD: Currency.UnitedStatesDollar,
  NGN: Currency.NigerianNaira,
};

export const TO_PERSISTENCE_CURRENCY: Record<Currency, PrismaCurrency> = {
  [Currency.UnitedStatesDollar]: 'USD',
  [Currency.NigerianNaira]: 'NGN',
};

export const TO_DOMAIN_INVOICE_STATUS: Record<PrismaInvoiceStatus, InvoiceStatus> = {
  PENDING: InvoiceStatus.Pending,
  PAID: InvoiceStatus.Paid,
  CANCELLED: InvoiceStatus.Cancelled,
  // A written off (bad debt) invoice is closed to the payer, like a cancelled one.
  WRITTEN_OFF: InvoiceStatus.Cancelled,
};

export const TO_PERSISTENCE_INVOICE_STATUS: Record<InvoiceStatus, PrismaInvoiceStatus> = {
  [InvoiceStatus.Pending]: 'PENDING',
  [InvoiceStatus.Paid]: 'PAID',
  [InvoiceStatus.Cancelled]: 'CANCELLED',
};
