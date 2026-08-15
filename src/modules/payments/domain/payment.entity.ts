import { AggregateRoot } from '@shared/domain/aggregate-root.base';
import { Money } from '@shared/domain/money.vo';
import { PayableType } from './payable-type.enum';
import { PaymentProvider } from './payment-provider.enum';
import { PaymentStatus } from './payment-status.enum';

interface PaymentProps {
  ownerId: string;
  payableType: PayableType;
  payableId: string;
  provider: PaymentProvider;
  providerReference: string;
  amount: Money;
  status: PaymentStatus;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Payment aggregate: one charge for a booking or subscription through a provider.
 * The provider reference ties it to the provider's record; the status only moves
 * off pending in response to a verification or a signed webhook, never on the
 * client's word.
 */
export class Payment extends AggregateRoot<string> {
  private props: PaymentProps;

  private constructor(id: string, props: PaymentProps) {
    super(id);
    this.props = props;
  }

  public static initiate(params: {
    id: string;
    ownerId: string;
    payableType: PayableType;
    payableId: string;
    provider: PaymentProvider;
    providerReference: string;
    amount: Money;
    now: Date;
  }): Payment {
    return new Payment(params.id, {
      ownerId: params.ownerId,
      payableType: params.payableType,
      payableId: params.payableId,
      provider: params.provider,
      providerReference: params.providerReference,
      amount: params.amount,
      status: PaymentStatus.Pending,
      createdAt: params.now,
      updatedAt: params.now,
    });
  }

  public static rehydrate(id: string, props: PaymentProps): Payment {
    return new Payment(id, props);
  }

  /** Whether a terminal state has already been recorded (webhooks may retry). */
  public get isSettled(): boolean {
    return this.props.status !== PaymentStatus.Pending;
  }

  public markSucceeded(now: Date): void {
    if (this.isSettled) {
      return;
    }
    this.props.status = PaymentStatus.Succeeded;
    this.props.updatedAt = now;
  }

  public markFailed(now: Date): void {
    if (this.isSettled) {
      return;
    }
    this.props.status = PaymentStatus.Failed;
    this.props.updatedAt = now;
  }

  public get ownerId(): string {
    return this.props.ownerId;
  }

  public get payableType(): PayableType {
    return this.props.payableType;
  }

  public get payableId(): string {
    return this.props.payableId;
  }

  public get provider(): PaymentProvider {
    return this.props.provider;
  }

  public get providerReference(): string {
    return this.props.providerReference;
  }

  public get amount(): Money {
    return this.props.amount;
  }

  public get status(): PaymentStatus {
    return this.props.status;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }

  public get updatedAt(): Date {
    return this.props.updatedAt;
  }
}
