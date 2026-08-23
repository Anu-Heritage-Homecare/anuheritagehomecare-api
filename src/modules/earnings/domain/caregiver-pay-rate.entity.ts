import { Currency } from '@shared/domain/currency.enum';
import { ValidationException } from '@shared/domain/domain-exception';
import { Entity } from '@shared/domain/entity.base';

interface CaregiverPayRateProps {
  caregiverId: string;
  currency: Currency;
  hourlyRateMinor: number;
  overtimeMultiplierBps: number;
  regularHoursCap: number;
  weekendBonusMinor: number;
  taxRateBps: number;
}

const BASIS_POINTS = 10_000;

/**
 * The pay rate and rules for one caregiver: their hourly rate, the overtime
 * multiplier, how many regular hours a pay period allows before overtime, the
 * flat weekend visit bonus and the deduction (tax) rate. Money is integer minor
 * units and rates are basis points, so the earnings arithmetic never touches
 * floating point. A caregiver without a rate simply estimates to zero.
 */
export class CaregiverPayRate extends Entity<string> {
  private readonly props: CaregiverPayRateProps;

  private constructor(id: string, props: CaregiverPayRateProps) {
    super(id);
    this.props = props;
  }

  public static create(params: {
    id: string;
    caregiverId: string;
    currency: Currency;
    hourlyRateMinor: number;
    overtimeMultiplierBps: number;
    regularHoursCap: number;
    weekendBonusMinor: number;
    taxRateBps: number;
  }): CaregiverPayRate {
    CaregiverPayRate.assertNonNegativeInteger(params.hourlyRateMinor, 'Hourly rate');
    CaregiverPayRate.assertNonNegativeInteger(params.weekendBonusMinor, 'Weekend bonus');
    CaregiverPayRate.assertNonNegativeInteger(params.regularHoursCap, 'Regular hours cap');
    if (!Number.isInteger(params.overtimeMultiplierBps) || params.overtimeMultiplierBps < 0) {
      throw new ValidationException('The overtime multiplier must be a non negative integer');
    }
    if (
      !Number.isInteger(params.taxRateBps) ||
      params.taxRateBps < 0 ||
      params.taxRateBps > BASIS_POINTS
    ) {
      throw new ValidationException('The tax rate must be between 0 and 10000 basis points');
    }
    return new CaregiverPayRate(params.id, {
      caregiverId: params.caregiverId,
      currency: params.currency,
      hourlyRateMinor: params.hourlyRateMinor,
      overtimeMultiplierBps: params.overtimeMultiplierBps,
      regularHoursCap: params.regularHoursCap,
      weekendBonusMinor: params.weekendBonusMinor,
      taxRateBps: params.taxRateBps,
    });
  }

  public static rehydrate(id: string, props: CaregiverPayRateProps): CaregiverPayRate {
    return new CaregiverPayRate(id, props);
  }

  private static assertNonNegativeInteger(value: number, label: string): void {
    if (!Number.isInteger(value) || value < 0) {
      throw new ValidationException(`${label} must be a non negative integer`);
    }
  }

  public get caregiverId(): string {
    return this.props.caregiverId;
  }

  public get currency(): Currency {
    return this.props.currency;
  }

  public get hourlyRateMinor(): number {
    return this.props.hourlyRateMinor;
  }

  public get overtimeMultiplierBps(): number {
    return this.props.overtimeMultiplierBps;
  }

  public get regularHoursCap(): number {
    return this.props.regularHoursCap;
  }

  public get weekendBonusMinor(): number {
    return this.props.weekendBonusMinor;
  }

  public get taxRateBps(): number {
    return this.props.taxRateBps;
  }
}
