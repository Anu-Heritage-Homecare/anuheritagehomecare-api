import {
  Currency as PrismaCurrency,
  PayableType as PrismaPayableType,
  PaymentProvider as PrismaPaymentProvider,
  PaymentStatus as PrismaPaymentStatus,
} from '@prisma/client';

/** One row of the Payment Processing and Transaction Logs table. */
export interface TransactionRowView {
  id: string;
  reference: string;
  ownerName: string | null;
  provider: PrismaPaymentProvider;
  payableType: PrismaPayableType;
  amountMinor: number;
  status: PrismaPaymentStatus;
  createdAt: Date;
}

/** A page of transaction rows plus the total matching the filter. */
export interface TransactionPageView {
  total: number;
  rows: TransactionRowView[];
}

/**
 * Read model over the payments table for the admin transaction log. Currency
 * scoped, so amounts on the page are all in the same money.
 */
export interface TransactionsReadModel {
  listTransactions(
    currency: PrismaCurrency,
    status: PrismaPaymentStatus | null,
    page: number,
    pageSize: number,
  ): Promise<TransactionPageView>;
}

export const TRANSACTIONS_READ_MODEL = Symbol('TRANSACTIONS_READ_MODEL');
