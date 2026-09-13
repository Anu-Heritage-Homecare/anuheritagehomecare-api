import { Currency } from '@shared/domain/currency.enum';
import { Entity } from '@shared/domain/entity.base';
import { ValidationException } from '@shared/domain/domain-exception';

interface BillingProfileProps {
  careRecipientId: string;
  billingContactName: string | null;
  billingContactRelationship: string | null;
  billingContactEmail: string | null;
  billingContactPhone: string | null;
  paymentMethodBrand: string | null;
  paymentMethodLast4: string | null;
  autoPayEnabled: boolean;
  primaryInsuranceProvider: string | null;
  primaryInsurancePolicyNumber: string | null;
  primaryInsuranceCoveragePercent: number | null;
  primaryInsuranceCoverageDetails: string | null;
  coPayPerVisitMinor: number | null;
  coPayCurrency: Currency | null;
  secondaryInsurance: string | null;
  updatedAt: Date;
}

const MAX_SHORT = 200;
const MAX_LONG = 500;
const MAX_LAST4 = 4;

/**
 * The office set billing and insurance profile for a care recipient: the billing
 * contact (guarantor), the payment method summary, primary and secondary insurance
 * and the per visit co-pay. One per recipient. Only display safe payment details
 * are stored (a card brand and last four); never a full card number.
 */
export class BillingProfile extends Entity<string> {
  private readonly props: BillingProfileProps;

  private constructor(id: string, props: BillingProfileProps) {
    super(id);
    this.props = props;
  }

  public static create(params: {
    id: string;
    careRecipientId: string;
    billingContactName?: string | null;
    billingContactRelationship?: string | null;
    billingContactEmail?: string | null;
    billingContactPhone?: string | null;
    paymentMethodBrand?: string | null;
    paymentMethodLast4?: string | null;
    autoPayEnabled?: boolean;
    primaryInsuranceProvider?: string | null;
    primaryInsurancePolicyNumber?: string | null;
    primaryInsuranceCoveragePercent?: number | null;
    primaryInsuranceCoverageDetails?: string | null;
    coPayPerVisitMinor?: number | null;
    coPayCurrency?: Currency | null;
    secondaryInsurance?: string | null;
    now: Date;
  }): BillingProfile {
    const coPay = params.coPayPerVisitMinor ?? null;
    if (coPay !== null && (!Number.isInteger(coPay) || coPay < 0)) {
      throw new ValidationException('A co-pay amount must be a non negative integer');
    }
    const percent = params.primaryInsuranceCoveragePercent ?? null;
    if (percent !== null && (!Number.isInteger(percent) || percent < 0 || percent > 100)) {
      throw new ValidationException('An insurance coverage percent must be between 0 and 100');
    }
    const last4 = BillingProfile.clean(params.paymentMethodLast4, MAX_LAST4, 'card last four');
    return new BillingProfile(params.id, {
      careRecipientId: params.careRecipientId,
      billingContactName: BillingProfile.clean(
        params.billingContactName,
        MAX_SHORT,
        'contact name',
      ),
      billingContactRelationship: BillingProfile.clean(
        params.billingContactRelationship,
        MAX_SHORT,
        'relationship',
      ),
      billingContactEmail: BillingProfile.clean(params.billingContactEmail, MAX_SHORT, 'email'),
      billingContactPhone: BillingProfile.clean(params.billingContactPhone, MAX_SHORT, 'phone'),
      paymentMethodBrand: BillingProfile.clean(params.paymentMethodBrand, MAX_SHORT, 'card brand'),
      paymentMethodLast4: last4,
      autoPayEnabled: params.autoPayEnabled ?? false,
      primaryInsuranceProvider: BillingProfile.clean(
        params.primaryInsuranceProvider,
        MAX_SHORT,
        'insurance provider',
      ),
      primaryInsurancePolicyNumber: BillingProfile.clean(
        params.primaryInsurancePolicyNumber,
        MAX_SHORT,
        'policy number',
      ),
      primaryInsuranceCoveragePercent: percent,
      primaryInsuranceCoverageDetails: BillingProfile.clean(
        params.primaryInsuranceCoverageDetails,
        MAX_LONG,
        'coverage details',
      ),
      coPayPerVisitMinor: coPay,
      coPayCurrency: params.coPayCurrency ?? null,
      secondaryInsurance: BillingProfile.clean(
        params.secondaryInsurance,
        MAX_LONG,
        'secondary insurance',
      ),
      updatedAt: params.now,
    });
  }

  public static rehydrate(id: string, props: BillingProfileProps): BillingProfile {
    return new BillingProfile(id, props);
  }

  private static clean(raw: string | null | undefined, max: number, label: string): string | null {
    if (raw === null || raw === undefined) {
      return null;
    }
    const value = raw.trim();
    if (value.length === 0) {
      return null;
    }
    if (value.length > max) {
      throw new ValidationException(`A billing ${label} exceeds the maximum length`);
    }
    return value;
  }

  public get careRecipientId(): string {
    return this.props.careRecipientId;
  }
  public get billingContactName(): string | null {
    return this.props.billingContactName;
  }
  public get billingContactRelationship(): string | null {
    return this.props.billingContactRelationship;
  }
  public get billingContactEmail(): string | null {
    return this.props.billingContactEmail;
  }
  public get billingContactPhone(): string | null {
    return this.props.billingContactPhone;
  }
  public get paymentMethodBrand(): string | null {
    return this.props.paymentMethodBrand;
  }
  public get paymentMethodLast4(): string | null {
    return this.props.paymentMethodLast4;
  }
  public get autoPayEnabled(): boolean {
    return this.props.autoPayEnabled;
  }
  public get primaryInsuranceProvider(): string | null {
    return this.props.primaryInsuranceProvider;
  }
  public get primaryInsurancePolicyNumber(): string | null {
    return this.props.primaryInsurancePolicyNumber;
  }
  public get primaryInsuranceCoveragePercent(): number | null {
    return this.props.primaryInsuranceCoveragePercent;
  }
  public get primaryInsuranceCoverageDetails(): string | null {
    return this.props.primaryInsuranceCoverageDetails;
  }
  public get coPayPerVisitMinor(): number | null {
    return this.props.coPayPerVisitMinor;
  }
  public get coPayCurrency(): Currency | null {
    return this.props.coPayCurrency;
  }
  public get secondaryInsurance(): string | null {
    return this.props.secondaryInsurance;
  }
  public get updatedAt(): Date {
    return this.props.updatedAt;
  }
}
