import { BillingInvoiceDetailResult } from '../../application/dto/billing-invoice-detail.result';
import { buildInvoicePdf } from './invoice-pdf';

function invoice(overrides: Partial<BillingInvoiceDetailResult> = {}): BillingInvoiceDetailResult {
  return {
    id: 'inv-1',
    number: 'INV-2026-042',
    status: 'PAID',
    billingAccountId: 'acc-1',
    billingAccountName: 'Adeyemi Family Account',
    careRecipientName: 'Funmilayo Adeyemi',
    careRecipientPhotoKey: null,
    invoiceDate: '2026-08-01T00:00:00.000Z',
    dueDate: '2026-08-15T00:00:00.000Z',
    paymentTerms: 'Net 14',
    servicePeriodStart: '2026-08-01T00:00:00.000Z',
    servicePeriodEnd: '2026-08-15T00:00:00.000Z',
    currency: 'NGN',
    totalAmountMinor: 25_000_000,
    insuranceCoveredMinor: 0,
    amountPaidMinor: 25_000_000,
    balanceDueMinor: 0,
    percentPaid: 100,
    lineItems: [
      {
        serviceName: 'Personal Care Support',
        quantity: 50,
        unit: 'HOURLY',
        rateMinor: 500_000,
        amountMinor: 25_000_000,
      },
    ],
    ...overrides,
  };
}

describe('buildInvoicePdf', () => {
  it('produces a well formed PDF named after the invoice', () => {
    const { filename, pdf } = buildInvoicePdf(invoice());

    expect(filename).toBe('INV-2026-042.pdf');
    const text = pdf.toString('latin1');
    expect(text.startsWith('%PDF-1.4')).toBe(true);
    expect(text.trimEnd().endsWith('%%EOF')).toBe(true);
    expect(text).toContain('startxref');
    // The declared startxref offset must point exactly at the xref table.
    const declared = Number(
      text
        .slice(text.lastIndexOf('startxref') + 'startxref'.length)
        .trim()
        .split('\n')[0],
    );
    expect(text.slice(declared, declared + 4)).toBe('xref');
    // The formatted amount (minor units to NGN) is rendered.
    expect(text).toContain('NGN 250,000.00');
    expect(text).toContain('INVOICE');
  });

  it('escapes parentheses in text so the content stream stays valid', () => {
    const { pdf } = buildInvoicePdf(invoice({ billingAccountName: 'Okafor (Home Visit)' }));
    expect(pdf.toString('latin1')).toContain('Okafor \\(Home Visit\\)');
  });
});
