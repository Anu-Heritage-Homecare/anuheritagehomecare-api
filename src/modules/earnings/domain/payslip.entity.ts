import { AggregateRoot } from '@shared/domain/aggregate-root.base';
import { ValidationException } from '@shared/domain/domain-exception';
import { Currency } from '@shared/domain/currency.enum';

/** The priced breakdown captured on a payslip, in integer minor units and minutes. */
export interface PayslipBreakdown {
  regularMinutes: number;
  regularPayMinor: number;
  overtimeMinutes: number;
  overtimePayMinor: number;
  weekendVisits: number;
  weekendBonusMinor: number;
  grossMinor: number;
  deductionsMinor: number;
  netMinor: number;
}

interface PayslipProps {
  caregiverId: string;
  currency: Currency;
  periodStart: Date;
  periodEnd: Date;
  payDay: Date;
  workedMinutes: number;
  breakdown: PayslipBreakdown;
  issuedAt: Date;
}

/**
 * Payslip aggregate root: an immutable snapshot of a caregiver's pay for one
 * closed pay period, produced by the payroll run. It stores what was worked and
 * the resulting breakdown so the figures never drift even if the pay rate changes
 * later. Construction goes through the factory so a slip is never invalid.
 */
export class Payslip extends AggregateRoot<string> {
  private readonly props: PayslipProps;

  private constructor(id: string, props: PayslipProps) {
    super(id);
    this.props = props;
  }

  /** Issue a payslip for a caregiver's closed period. */
  public static issue(params: {
    id: string;
    caregiverId: string;
    currency: Currency;
    periodStart: Date;
    periodEnd: Date;
    payDay: Date;
    workedMinutes: number;
    breakdown: PayslipBreakdown;
    issuedAt: Date;
  }): Payslip {
    for (const date of [params.periodStart, params.periodEnd, params.payDay, params.issuedAt]) {
      if (Number.isNaN(date.getTime())) {
        throw new ValidationException('A payslip date is not valid');
      }
    }
    if (params.periodEnd.getTime() < params.periodStart.getTime()) {
      throw new ValidationException('The payslip period ends before it starts');
    }
    if (params.workedMinutes < 0) {
      throw new ValidationException('Worked minutes cannot be negative');
    }
    return new Payslip(params.id, {
      caregiverId: params.caregiverId,
      currency: params.currency,
      periodStart: params.periodStart,
      periodEnd: params.periodEnd,
      payDay: params.payDay,
      workedMinutes: params.workedMinutes,
      breakdown: params.breakdown,
      issuedAt: params.issuedAt,
    });
  }

  /** Rehydrate an existing payslip from persistence. */
  public static rehydrate(id: string, props: PayslipProps): Payslip {
    return new Payslip(id, props);
  }

  public get caregiverId(): string {
    return this.props.caregiverId;
  }

  public get currency(): Currency {
    return this.props.currency;
  }

  public get periodStart(): Date {
    return this.props.periodStart;
  }

  public get periodEnd(): Date {
    return this.props.periodEnd;
  }

  public get payDay(): Date {
    return this.props.payDay;
  }

  public get workedMinutes(): number {
    return this.props.workedMinutes;
  }

  public get breakdown(): PayslipBreakdown {
    return this.props.breakdown;
  }

  public get issuedAt(): Date {
    return this.props.issuedAt;
  }
}
