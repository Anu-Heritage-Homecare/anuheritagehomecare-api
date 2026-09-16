import { PayableType, PaymentProvider, PaymentStatus } from '@prisma/client';
import { Currency } from '@shared/domain/currency.enum';
import { TransactionPageView, TransactionsReadModel } from '../ports/transactions-read.port';
import { ListTransactionsUseCase } from './list-transactions.use-case';

function page(): TransactionPageView {
  return {
    total: 1,
    rows: [
      {
        id: 'p1',
        reference: 'pi_123',
        ownerName: 'David Johnson',
        provider: PaymentProvider.STRIPE,
        payableType: PayableType.SUBSCRIPTION,
        amountMinor: 100_000,
        status: PaymentStatus.SUCCEEDED,
        createdAt: new Date('2026-09-15T12:00:00.000Z'),
      },
    ],
  };
}

function useCase(): ListTransactionsUseCase {
  const reads: TransactionsReadModel = { listTransactions: () => Promise.resolve(page()) };
  return new ListTransactionsUseCase(reads);
}

describe('ListTransactionsUseCase', () => {
  it('maps transactions with the paying client and formatted fields', async () => {
    const result = await useCase().execute({
      currency: Currency.UnitedStatesDollar,
      status: null,
      page: 1,
      pageSize: 20,
    });
    expect(result.currency).toBe('USD');
    expect(result.total).toBe(1);
    const row = result.rows[0];
    expect(row.reference).toBe('pi_123');
    expect(row.clientName).toBe('David Johnson');
    expect(row.provider).toBe('STRIPE');
    expect(row.payableType).toBe('SUBSCRIPTION');
    expect(row.status).toBe('SUCCEEDED');
    expect(row.currency).toBe('USD');
    expect(row.createdAt).toBe('2026-09-15T12:00:00.000Z');
  });
});
