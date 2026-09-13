import { Currency } from '@shared/domain/currency.enum';
import { Entity } from '@shared/domain/entity.base';
import { ValidationException } from '@shared/domain/domain-exception';

interface InvoicePaymentProps {
  careRecipientId: string;
  invoiceId: string | null;
  amountMinor: number;
  currency: Currency;
  /** How the payment was taken, for display (for example "Visa ****4521 (Auto-pay)"). */
  methodLabel: string | null;
  receivedAt: Date;
  createdAt: Date;
}

const MAX_METHOD_LENGTH = 120;

/**
 * A payment received towards a recipient's invoices (a patient or insurance
 * settlement). Money is integer minor units in the owner's billing currency.
 * Immutable once recorded; feeds the payment history and the last payment card.
 */
export class InvoicePayment extends Entity<string> {
  private readonly props: InvoicePaymentProps;

  private constructor(id: string, props: InvoicePaymentProps) {
    super(id);
    this.props = props;
  }

  public static record(params: {
    id: string;
    careRecipientId: string;
    invoiceId?: string | null;
    amountMinor: number;
    currency: Currency;
    methodLabel?: string | null;
    receivedAt: Date;
    now: Date;
  }): InvoicePayment {
    if (!Number.isInteger(params.amountMinor) || params.amountMinor <= 0) {
      throw new ValidationException('A payment amount must be a positive integer');
    }
    if (Number.isNaN(params.receivedAt.getTime())) {
      throw new ValidationException('The payment received date is not valid');
    }
    return new InvoicePayment(params.id, {
      careRecipientId: params.careRecipientId,
      invoiceId: params.invoiceId ?? null,
      amountMinor: params.amountMinor,
      currency: params.currency,
      methodLabel: InvoicePayment.cleanMethod(params.methodLabel),
      receivedAt: params.receivedAt,
      createdAt: params.now,
    });
  }

  public static rehydrate(id: string, props: InvoicePaymentProps): InvoicePayment {
    return new InvoicePayment(id, props);
  }

  private static cleanMethod(raw: string | null | undefined): string | null {
    if (raw === null || raw === undefined) {
      return null;
    }
    const value = raw.trim();
    if (value.length === 0) {
      return null;
    }
    if (value.length > MAX_METHOD_LENGTH) {
      throw new ValidationException('A payment method label exceeds the maximum length');
    }
    return value;
  }

  public get careRecipientId(): string {
    return this.props.careRecipientId;
  }

  public get invoiceId(): string | null {
    return this.props.invoiceId;
  }

  public get amountMinor(): number {
    return this.props.amountMinor;
  }

  public get currency(): Currency {
    return this.props.currency;
  }

  public get methodLabel(): string | null {
    return this.props.methodLabel;
  }

  public get receivedAt(): Date {
    return this.props.receivedAt;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }
}
