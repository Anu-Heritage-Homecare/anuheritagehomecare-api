import { BillingAccountPaymentsResult } from '../../application/dto/billing-account-payments.result';
import { paymentsToCsv } from './payments-csv';

function result(): BillingAccountPaymentsResult {
  return {
    total: 2,
    payments: [
      {
        id: 'p1',
        reference: 'TXN-84729103',
        invoiceNumber: 'INV-2026-042',
        amountMinor: 25_000_000,
        currency: 'NGN',
        method: 'Bank Transfer',
        receivedAt: '2026-08-12T09:00:00.000Z',
        status: 'COMPLETED',
      },
      {
        id: 'p2',
        reference: 'TXN-83940192',
        invoiceNumber: null,
        amountMinor: 60_000_000,
        currency: 'NGN',
        method: 'Card (Mastercard)',
        receivedAt: '2026-07-14T09:00:00.000Z',
        status: 'COMPLETED',
      },
    ],
  };
}

describe('paymentsToCsv', () => {
  it('writes a header and one quoted row per payment', () => {
    const csv = paymentsToCsv(result()).toString('utf8');
    const lines = csv.split('\r\n');

    expect(lines[0]).toBe('"Payment Ref","Invoice","Amount","Currency","Method","Date","Status"');
    expect(lines[1]).toBe(
      '"TXN-84729103","INV-2026-042","250000.00","NGN","Bank Transfer","2026-08-12","COMPLETED"',
    );
    // An unlinked payment leaves the invoice column empty; commas inside a field are
    // safe because every field is quoted.
    expect(lines[2]).toContain('"","600000.00"');
    expect(lines[2]).toContain('"Card (Mastercard)"');
  });
});
