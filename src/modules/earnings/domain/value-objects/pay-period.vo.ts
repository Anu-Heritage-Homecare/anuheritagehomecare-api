import { ValidationException } from '@shared/domain/domain-exception';
import { ValueObject } from '@shared/domain/value-object.base';

interface PayPeriodProps {
  startDate: Date;
  lengthDays: number;
  paydayOffsetDays: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

function wholeDaysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / DAY_MS);
}

/**
 * A caregiver pay period: a fixed length window of days aligned to a reference
 * anchor, with a payday a set number of days after it ends. All arithmetic is in
 * whole UTC days so it stays free of timezone drift. The period that contains a
 * given day is derived, never stored, so it is always current.
 */
export class PayPeriod extends ValueObject<PayPeriodProps> {
  private constructor(props: PayPeriodProps) {
    super(props);
  }

  /** The pay period that contains the reference day. */
  public static containing(params: {
    reference: Date;
    anchor: Date;
    lengthDays: number;
    paydayOffsetDays: number;
  }): PayPeriod {
    if (!Number.isInteger(params.lengthDays) || params.lengthDays <= 0) {
      throw new ValidationException('The pay period length must be a positive number of days');
    }
    const reference = startOfUtcDay(params.reference);
    const anchor = startOfUtcDay(params.anchor);
    const elapsed = wholeDaysBetween(anchor, reference);
    const periodIndex = Math.floor(elapsed / params.lengthDays);
    const startDate = addDays(anchor, periodIndex * params.lengthDays);
    return new PayPeriod({
      startDate,
      lengthDays: params.lengthDays,
      paydayOffsetDays: params.paydayOffsetDays,
    });
  }

  /** First day of the period (inclusive). */
  public get startDate(): Date {
    return this.props.startDate;
  }

  /** Last day of the period (inclusive). */
  public get lastDay(): Date {
    return addDays(this.props.startDate, this.props.lengthDays - 1);
  }

  /** First day after the period, for a half open [start, endExclusive) query. */
  public get endExclusive(): Date {
    return addDays(this.props.startDate, this.props.lengthDays);
  }

  /** The day wages for this period are paid. */
  public get payDay(): Date {
    return addDays(this.lastDay, this.props.paydayOffsetDays);
  }

  public get totalDays(): number {
    return this.props.lengthDays;
  }

  /** How many days of the period have elapsed through the reference day (1..total). */
  public elapsedDays(reference: Date): number {
    const day = wholeDaysBetween(this.props.startDate, startOfUtcDay(reference)) + 1;
    return Math.min(Math.max(day, 1), this.props.lengthDays);
  }

  /** Whole days from the reference day until payday, never negative. */
  public daysUntilPayday(reference: Date): number {
    return Math.max(0, wholeDaysBetween(startOfUtcDay(reference), this.payDay));
  }

  /** Progress through the period as a whole percentage. */
  public progressPercent(reference: Date): number {
    return Math.round((this.elapsedDays(reference) / this.props.lengthDays) * 100);
  }
}
