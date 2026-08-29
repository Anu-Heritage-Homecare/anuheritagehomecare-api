import { AggregateRoot } from '@shared/domain/aggregate-root.base';
import { ValidationException } from '@shared/domain/domain-exception';
import { Currency } from '@shared/domain/currency.enum';
import { InvoiceStatus } from './invoice-status.enum';

interface InvoiceProps {
  ownerId: string;
  careRecipientId: string;
  subscriptionId: string;
  number: string;
  currency: Currency;
  amountMinor: number;
  periodStart: Date;
  periodEnd: Date;
  dueDate: Date;
  status: InvoiceStatus;
  issuedAt: Date;
  paidAt: Date | null;
}

/**
 * Invoice aggregate root: a bill issued to a family owner for one monthly
 * subscription period. Money is in integer minor units. Construction goes through
 * the factory so an invoice is never invalid; it is marked paid once a payment
 * settles it.
 */
export class Invoice extends AggregateRoot<string> {
  private props: InvoiceProps;

  private constructor(id: string, props: InvoiceProps) {
    super(id);
    this.props = props;
  }

  public static issue(params: {
    id: string;
    ownerId: string;
    careRecipientId: string;
    subscriptionId: string;
    number: string;
    currency: Currency;
    amountMinor: number;
    periodStart: Date;
    periodEnd: Date;
    dueDate: Date;
    issuedAt: Date;
  }): Invoice {
    if (!Number.isInteger(params.amountMinor) || params.amountMinor < 0) {
      throw new ValidationException('An invoice amount must be a non negative whole number');
    }
    if (params.periodEnd.getTime() < params.periodStart.getTime()) {
      throw new ValidationException('The invoice period ends before it starts');
    }
    return new Invoice(params.id, {
      ownerId: params.ownerId,
      careRecipientId: params.careRecipientId,
      subscriptionId: params.subscriptionId,
      number: params.number,
      currency: params.currency,
      amountMinor: params.amountMinor,
      periodStart: params.periodStart,
      periodEnd: params.periodEnd,
      dueDate: params.dueDate,
      status: InvoiceStatus.Issued,
      issuedAt: params.issuedAt,
      paidAt: null,
    });
  }

  public static rehydrate(id: string, props: InvoiceProps): Invoice {
    return new Invoice(id, props);
  }

  /** Settle the invoice once a payment for it has succeeded. */
  public markPaid(paidAt: Date): void {
    if (this.props.status === InvoiceStatus.Void) {
      throw new ValidationException('A void invoice cannot be paid');
    }
    this.props.status = InvoiceStatus.Paid;
    this.props.paidAt = paidAt;
  }

  public get ownerId(): string {
    return this.props.ownerId;
  }

  public get careRecipientId(): string {
    return this.props.careRecipientId;
  }

  public get subscriptionId(): string {
    return this.props.subscriptionId;
  }

  public get number(): string {
    return this.props.number;
  }

  public get currency(): Currency {
    return this.props.currency;
  }

  public get amountMinor(): number {
    return this.props.amountMinor;
  }

  public get periodStart(): Date {
    return this.props.periodStart;
  }

  public get periodEnd(): Date {
    return this.props.periodEnd;
  }

  public get dueDate(): Date {
    return this.props.dueDate;
  }

  public get status(): InvoiceStatus {
    return this.props.status;
  }

  public get issuedAt(): Date {
    return this.props.issuedAt;
  }

  public get paidAt(): Date | null {
    return this.props.paidAt;
  }
}
