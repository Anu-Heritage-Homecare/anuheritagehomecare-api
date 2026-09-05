import { Currency } from '@shared/domain/currency.enum';
import { ValidationException } from '@shared/domain/domain-exception';
import { Invoice } from './invoice.entity';
import { InvoiceLineItem } from './invoice-line-item.vo';

const BASE = {
  id: 'inv-1',
  ownerId: 'owner-1',
  careRecipientId: 'r1',
  subscriptionId: 'sub-1',
  number: 'INV-1',
  currency: Currency.NigerianNaira,
  periodStart: new Date('2026-07-15'),
  periodEnd: new Date('2026-08-14'),
  dueDate: new Date('2026-07-15'),
  issuedAt: new Date('2026-07-15'),
};

const lines = [
  InvoiceLineItem.create({ description: 'Medication Support', amountMinor: 100_000 }),
  InvoiceLineItem.create({ description: 'Meal Assistance', amountMinor: 50_000 }),
];

describe('Invoice', () => {
  it('computes subtotal, tax and total from the line items', () => {
    const invoice = Invoice.issue({
      ...BASE,
      lineItems: lines,
      taxRateBps: 333,
      discountMinor: 5_000,
    });

    expect(invoice.subtotalMinor).toBe(150_000);
    expect(invoice.taxMinor).toBe(4_995);
    expect(invoice.discountMinor).toBe(5_000);
    expect(invoice.amountMinor).toBe(149_995);
  });

  it('requires at least one line item', () => {
    expect(() =>
      Invoice.issue({ ...BASE, lineItems: [], taxRateBps: 0, discountMinor: 0 }),
    ).toThrow(ValidationException);
  });

  it('rejects a discount larger than the taxed subtotal', () => {
    expect(() =>
      Invoice.issue({ ...BASE, lineItems: lines, taxRateBps: 0, discountMinor: 150_001 }),
    ).toThrow(ValidationException);
  });

  it('rejects a tax rate above one hundred percent', () => {
    expect(() =>
      Invoice.issue({ ...BASE, lineItems: lines, taxRateBps: 10_001, discountMinor: 0 }),
    ).toThrow(ValidationException);
  });
});
