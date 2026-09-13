import { Currency } from '@shared/domain/currency.enum';
import { AggregateRoot } from '@shared/domain/aggregate-root.base';
import { ValidationException } from '@shared/domain/domain-exception';
import { InvoiceLine } from './invoice-line.entity';
import { InvoiceStatus } from './invoice-status.enum';

interface InvoiceProps {
  careRecipientId: string;
  periodStart: Date;
  periodEnd: Date;
  /** A human summary of the services billed (for example "Morning + Afternoon Care (15 visits)"). */
  servicesLabel: string;
  currency: Currency;
  insuranceCoveredMinor: number;
  status: InvoiceStatus;
  issuedAt: Date;
  dueDate: Date | null;
  lines: InvoiceLine[];
  createdAt: Date;
}

const MAX_LABEL_LENGTH = 300;

/**
 * An office issued invoice for a care recipient over a billing period. The amount
 * is the sum of its service lines; insurance covers part of it and the remainder is
 * the patient due. Money is integer minor units in the owner's billing currency,
 * derived server side. The aggregate root owns its lines.
 */
export class Invoice extends AggregateRoot<string> {
  private readonly props: InvoiceProps;

  private constructor(id: string, props: InvoiceProps) {
    super(id);
    this.props = props;
  }

  public static issue(params: {
    id: string;
    careRecipientId: string;
    periodStart: Date;
    periodEnd: Date;
    servicesLabel: string;
    currency: Currency;
    insuranceCoveredMinor: number;
    dueDate?: Date | null;
    lines: InvoiceLine[];
    status?: InvoiceStatus;
    now: Date;
  }): Invoice {
    const servicesLabel = params.servicesLabel.trim();
    if (servicesLabel.length === 0) {
      throw new ValidationException('An invoice must describe its services');
    }
    if (servicesLabel.length > MAX_LABEL_LENGTH) {
      throw new ValidationException('An invoice services label exceeds the maximum length');
    }
    if (params.lines.length === 0) {
      throw new ValidationException('An invoice must have at least one service line');
    }
    if (params.periodEnd.getTime() < params.periodStart.getTime()) {
      throw new ValidationException('An invoice period end cannot be before its start');
    }
    const amountMinor = params.lines.reduce((total, line) => total + line.amountMinor, 0);
    if (
      !Number.isInteger(params.insuranceCoveredMinor) ||
      params.insuranceCoveredMinor < 0 ||
      params.insuranceCoveredMinor > amountMinor
    ) {
      throw new ValidationException(
        'Insurance covered must be between zero and the invoice amount',
      );
    }
    return new Invoice(params.id, {
      careRecipientId: params.careRecipientId,
      periodStart: params.periodStart,
      periodEnd: params.periodEnd,
      servicesLabel,
      currency: params.currency,
      insuranceCoveredMinor: params.insuranceCoveredMinor,
      status: params.status ?? InvoiceStatus.Pending,
      issuedAt: params.now,
      dueDate: params.dueDate ?? null,
      lines: [...params.lines],
      createdAt: params.now,
    });
  }

  public static rehydrate(id: string, props: InvoiceProps): Invoice {
    return new Invoice(id, { ...props, lines: [...props.lines] });
  }

  /** Mark the invoice settled once a payment covers the patient due. */
  public markPaid(): void {
    this.props.status = InvoiceStatus.Paid;
  }

  public get careRecipientId(): string {
    return this.props.careRecipientId;
  }

  public get amountMinor(): number {
    return this.props.lines.reduce((total, line) => total + line.amountMinor, 0);
  }

  public get insuranceCoveredMinor(): number {
    return this.props.insuranceCoveredMinor;
  }

  public get patientDueMinor(): number {
    return this.amountMinor - this.props.insuranceCoveredMinor;
  }

  public get currency(): Currency {
    return this.props.currency;
  }

  public get status(): InvoiceStatus {
    return this.props.status;
  }

  public get periodStart(): Date {
    return this.props.periodStart;
  }

  public get periodEnd(): Date {
    return this.props.periodEnd;
  }

  public get servicesLabel(): string {
    return this.props.servicesLabel;
  }

  public get issuedAt(): Date {
    return this.props.issuedAt;
  }

  public get dueDate(): Date | null {
    return this.props.dueDate;
  }

  public get lines(): InvoiceLine[] {
    return [...this.props.lines];
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }
}
