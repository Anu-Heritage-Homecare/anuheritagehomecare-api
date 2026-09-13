import { Currency } from '@shared/domain/currency.enum';
import { ValidationException } from '@shared/domain/domain-exception';
import { InvoiceLine } from './invoice-line.entity';
import { InvoiceStatus } from './invoice-status.enum';
import { Invoice } from './invoice.entity';

const NOW = new Date('2026-07-20T00:00:00.000Z');

function line(id: string, name: string, amount: number): InvoiceLine {
  return InvoiceLine.create({ id, serviceName: name, amountMinor: amount });
}

function issue(overrides: Partial<Parameters<typeof Invoice.issue>[0]> = {}): Invoice {
  return Invoice.issue({
    id: 'inv1',
    careRecipientId: 'r1',
    periodStart: new Date('2026-07-01T00:00:00.000Z'),
    periodEnd: new Date('2026-07-15T00:00:00.000Z'),
    servicesLabel: 'Morning + Afternoon Care (15 visits)',
    currency: Currency.NigerianNaira,
    insuranceCoveredMinor: 360_000,
    lines: [line('l1', 'Morning Care', 300_000), line('l2', 'Afternoon Care', 150_000)],
    now: NOW,
    ...overrides,
  });
}

describe('Invoice', () => {
  it('totals its lines and derives the patient due', () => {
    const invoice = issue();
    expect(invoice.amountMinor).toBe(450_000);
    expect(invoice.insuranceCoveredMinor).toBe(360_000);
    expect(invoice.patientDueMinor).toBe(90_000);
    expect(invoice.status).toBe(InvoiceStatus.Pending);
  });

  it('rejects insurance coverage above the invoice amount', () => {
    expect(() => issue({ insuranceCoveredMinor: 500_000 })).toThrow(ValidationException);
  });

  it('rejects an invoice with no lines', () => {
    expect(() => issue({ lines: [] })).toThrow(ValidationException);
  });

  it('rejects a period whose end precedes its start', () => {
    expect(() =>
      issue({
        periodStart: new Date('2026-07-15T00:00:00.000Z'),
        periodEnd: new Date('2026-07-01T00:00:00.000Z'),
      }),
    ).toThrow(ValidationException);
  });

  it('marks itself paid', () => {
    const invoice = issue();
    invoice.markPaid();
    expect(invoice.status).toBe(InvoiceStatus.Paid);
  });
});
