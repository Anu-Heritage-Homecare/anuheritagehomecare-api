import {
  BillingPaymentsReadModel,
  PaymentListFilter,
  PaymentListRowView,
  PaymentListView,
} from '../ports/billing-payments-read.port';
import { ListBillingPaymentsUseCase } from './list-billing-payments.use-case';

function row(overrides: Partial<PaymentListRowView> = {}): PaymentListRowView {
  return {
    id: 'p1',
    reference: 'PAY-2026-0812',
    receivedAt: new Date('2026-07-28T00:00:00.000Z'),
    invoiceNumber: 'INV-2026-451',
    billingAccountId: 'a1',
    billingAccountName: 'Adeyemi Family Account',
    amountMinor: 45_000_000,
    currency: 'NGN',
    methodLabel: 'Bank Transfer',
    status: 'COMPLETED',
    ...overrides,
  };
}

describe('ListBillingPaymentsUseCase', () => {
  it('maps rows to references and invoice numbers, paginates and returns tabs', async () => {
    let captured: PaymentListFilter | null = null;
    const view: PaymentListView = {
      rows: [row()],
      total: 478,
      counts: { all: 478, pending: 0, completed: 478, failed: 0, refunded: 0 },
      methods: ['Bank Transfer', 'Card Payment'],
    };
    const reads: BillingPaymentsReadModel = {
      list: (filter) => {
        captured = filter;
        return Promise.resolve(view);
      },
      detail: () => Promise.resolve(null),
    };

    const result = await new ListBillingPaymentsUseCase(reads).execute({
      status: 'COMPLETED',
      search: null,
      billingAccountId: null,
      method: null,
      receivedFrom: null,
      receivedTo: null,
      minAmountMinor: null,
      maxAmountMinor: null,
      page: 1,
      pageSize: null,
    });

    expect(captured).not.toBeNull();
    expect((captured as unknown as PaymentListFilter).pageSize).toBe(7);
    expect(result.total).toBe(478);
    expect(result.totalPages).toBe(69); // 478 over 7 rounds up to 69 pages
    expect(result.tabs.completed).toBe(478);
    expect(result.methods).toEqual(['Bank Transfer', 'Card Payment']);
    expect(result.payments[0]).toMatchObject({
      reference: 'PAY-2026-0812',
      invoiceNumber: 'INV-2026-451',
      billingAccountName: 'Adeyemi Family Account',
      method: 'Bank Transfer',
      status: 'COMPLETED',
    });
  });

  it('passes a null invoice and account through as null', async () => {
    const reads: BillingPaymentsReadModel = {
      list: () =>
        Promise.resolve({
          rows: [
            row({
              invoiceNumber: null,
              billingAccountId: null,
              billingAccountName: null,
            }),
          ],
          total: 1,
          counts: { all: 1, pending: 0, completed: 1, failed: 0, refunded: 0 },
          methods: [],
        }),
      detail: () => Promise.resolve(null),
    };
    const result = await new ListBillingPaymentsUseCase(reads).execute({
      status: null,
      search: null,
      billingAccountId: null,
      method: null,
      receivedFrom: null,
      receivedTo: null,
      minAmountMinor: null,
      maxAmountMinor: null,
      page: 1,
      pageSize: 7,
    });
    expect(result.payments[0].invoiceNumber).toBeNull();
    expect(result.payments[0].billingAccountName).toBeNull();
  });
});
