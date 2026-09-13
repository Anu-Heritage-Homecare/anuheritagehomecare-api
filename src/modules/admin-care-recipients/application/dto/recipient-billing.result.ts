export interface MoneyResult {
  amountMinor: number;
  currency: string;
}

export interface BillingSummaryResult {
  totalBilledThisMonth: MoneyResult | null;
  /** Percentage change in total billed versus last month, or null when incomputable. */
  billedTrendPercent: number | null;
  outstanding: MoneyResult | null;
  outstandingDueDate: Date | null;
  lastPayment: MoneyResult | null;
  lastPaymentAt: Date | null;
  /** GOOD when nothing is overdue, OVERDUE otherwise. */
  paymentStatus: string;
}

export interface BillingContactResult {
  name: string | null;
  relationship: string | null;
  email: string | null;
  phone: string | null;
}

export interface PaymentMethodResult {
  brand: string | null;
  last4: string | null;
  autoPayEnabled: boolean;
}

export interface InsuranceResult {
  provider: string | null;
  policyNumber: string | null;
  coveragePercent: number | null;
  coverageDetails: string | null;
  coPayPerVisit: MoneyResult | null;
  secondary: string | null;
}

export interface BillingProfileResult {
  contact: BillingContactResult;
  paymentMethod: PaymentMethodResult;
  insurance: InsuranceResult;
}

export interface InvoiceItemResult {
  id: string;
  number: string;
  period: { start: Date; end: Date };
  servicesLabel: string;
  amount: MoneyResult;
  insuranceCovered: MoneyResult;
  patientDue: MoneyResult;
  displayStatus: string;
}

export interface InvoicesPageResult {
  items: InvoiceItemResult[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ServiceBreakdownItemResult {
  serviceName: string;
  amount: MoneyResult;
  percent: number;
}

export interface ServiceBreakdownResult {
  total: MoneyResult | null;
  items: ServiceBreakdownItemResult[];
}

export interface PaymentHistoryItemResult {
  amount: MoneyResult;
  methodLabel: string | null;
  receivedAt: Date;
}

export interface RecipientBillingResult {
  summary: BillingSummaryResult;
  profile: BillingProfileResult;
  invoices: InvoicesPageResult;
  serviceBreakdown: ServiceBreakdownResult;
  paymentHistory: PaymentHistoryItemResult[];
}
