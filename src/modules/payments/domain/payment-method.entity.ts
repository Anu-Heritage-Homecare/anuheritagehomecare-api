import { Entity } from '@shared/domain/entity.base';
import { PaymentProvider } from './payment-provider.enum';

interface PaymentMethodProps {
  ownerId: string;
  provider: PaymentProvider;
  providerCustomerRef: string | null;
  providerMethodRef: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
  createdAt: Date;
}

/**
 * A saved card, tokenised by the provider. The raw card is never stored; only an
 * opaque provider reference plus display metadata (brand, last four, expiry).
 */
export class PaymentMethod extends Entity<string> {
  private props: PaymentMethodProps;

  private constructor(id: string, props: PaymentMethodProps) {
    super(id);
    this.props = props;
  }

  public static register(id: string, props: PaymentMethodProps): PaymentMethod {
    return new PaymentMethod(id, props);
  }

  public static rehydrate(id: string, props: PaymentMethodProps): PaymentMethod {
    return new PaymentMethod(id, props);
  }

  public makeDefault(): void {
    this.props.isDefault = true;
  }

  public get ownerId(): string {
    return this.props.ownerId;
  }

  public get provider(): PaymentProvider {
    return this.props.provider;
  }

  public get providerCustomerRef(): string | null {
    return this.props.providerCustomerRef;
  }

  public get providerMethodRef(): string {
    return this.props.providerMethodRef;
  }

  public get brand(): string {
    return this.props.brand;
  }

  public get last4(): string {
    return this.props.last4;
  }

  public get expMonth(): number {
    return this.props.expMonth;
  }

  public get expYear(): number {
    return this.props.expYear;
  }

  public get isDefault(): boolean {
    return this.props.isDefault;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }
}
