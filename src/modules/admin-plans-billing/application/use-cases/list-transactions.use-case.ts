import { Inject, Injectable } from '@nestjs/common';
import { Currency as PrismaCurrency, PaymentStatus as PrismaPaymentStatus } from '@prisma/client';
import { Currency } from '@shared/domain/currency.enum';
import { TRANSACTIONS_READ_MODEL, TransactionsReadModel } from '../ports/transactions-read.port';
import { TransactionListResult } from '../dto/transaction-list.result';

interface ListTransactionsCommand {
  currency: Currency;
  status: PrismaPaymentStatus | null;
  page: number;
  pageSize: number;
}

/**
 * List payment transactions for one market (currency), newest first, with the
 * paying client resolved. Read only.
 */
@Injectable()
export class ListTransactionsUseCase {
  constructor(@Inject(TRANSACTIONS_READ_MODEL) private readonly reads: TransactionsReadModel) {}

  async execute(command: ListTransactionsCommand): Promise<TransactionListResult> {
    const prismaCurrency =
      command.currency === Currency.NigerianNaira ? PrismaCurrency.NGN : PrismaCurrency.USD;

    const page = await this.reads.listTransactions(
      prismaCurrency,
      command.status,
      command.page,
      command.pageSize,
    );

    return {
      currency: String(command.currency),
      total: page.total,
      page: command.page,
      pageSize: command.pageSize,
      rows: page.rows.map((row) => ({
        id: row.id,
        reference: row.reference,
        clientName: row.ownerName,
        provider: String(row.provider),
        payableType: String(row.payableType),
        amountMinor: row.amountMinor,
        currency: String(command.currency),
        status: String(row.status),
        createdAt: row.createdAt.toISOString(),
      })),
    };
  }
}
