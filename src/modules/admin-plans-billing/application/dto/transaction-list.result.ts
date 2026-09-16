/** One row of the Payment Processing and Transaction Logs table. */
export interface TransactionRowResult {
  id: string;
  reference: string;
  clientName: string | null;
  provider: string;
  payableType: string;
  amountMinor: number;
  currency: string;
  status: string;
  createdAt: string;
}

export interface TransactionListResult {
  currency: string;
  total: number;
  page: number;
  pageSize: number;
  rows: TransactionRowResult[];
}
