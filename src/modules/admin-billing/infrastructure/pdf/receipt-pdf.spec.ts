import { buildReceiptPdf } from './receipt-pdf';

describe('buildReceiptPdf', () => {
  it('produces a well formed PDF named after the payment reference', () => {
    const { filename, pdf } = buildReceiptPdf({
      accountName: 'Adeyemi Family Account',
      payment: {
        id: 'p1',
        reference: 'TXN-84729103',
        invoiceNumber: 'INV-2026-042',
        amountMinor: 25_000_000,
        currency: 'NGN',
        method: 'Bank Transfer',
        receivedAt: '2026-08-12T09:00:00.000Z',
        status: 'COMPLETED',
      },
    });

    expect(filename).toBe('TXN-84729103.pdf');
    const text = pdf.toString('latin1');
    expect(text.startsWith('%PDF-1.4')).toBe(true);
    expect(text.trimEnd().endsWith('%%EOF')).toBe(true);
    const declared = Number(
      text
        .slice(text.lastIndexOf('startxref') + 'startxref'.length)
        .trim()
        .split('\n')[0],
    );
    expect(text.slice(declared, declared + 4)).toBe('xref');
    expect(text).toContain('PAYMENT RECEIPT');
    expect(text).toContain('NGN 250,000.00');
  });
});
