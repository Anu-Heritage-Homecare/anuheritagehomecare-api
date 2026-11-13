import { AggregateRoot } from '@shared/domain/aggregate-root.base';
import { Currency } from '@shared/domain/currency.enum';
import { ValidationException } from '@shared/domain/domain-exception';
import { RateUnit } from './rate-unit.enum';

const MAX_NAME = 160;
const MAX_DESCRIPTION = 300;
const MAX_DURATION_MINUTES = 60 * 24 * 7;

/** A base rate for a visit format in one currency (integer minor units). */
export interface FormatRate {
  currency: Currency;
  baseRateMinor: number;
}

interface VisitFormatProps {
  name: string;
  description: string | null;
  durationMinutes: number | null;
  rateUnit: RateUnit;
  sortOrder: number;
  isActive: boolean;
  rates: FormatRate[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * A bookable visit format with a duration and a base rate per currency. Money is
 * stored as integer minor units with an explicit currency, consistent with the
 * shared Money kernel; a per hour format leaves its duration null ("Varies").
 */
export class VisitFormat extends AggregateRoot<string> {
  private props: VisitFormatProps;

  private constructor(id: string, props: VisitFormatProps) {
    super(id);
    this.props = props;
  }

  public static create(params: {
    id: string;
    name: string;
    description?: string | null;
    durationMinutes?: number | null;
    rateUnit?: RateUnit;
    sortOrder?: number;
    isActive?: boolean;
    rates?: FormatRate[];
    now: Date;
  }): VisitFormat {
    return new VisitFormat(params.id, {
      name: VisitFormat.cleanName(params.name),
      description: VisitFormat.cleanDescription(params.description),
      durationMinutes: VisitFormat.cleanDuration(params.durationMinutes ?? null),
      rateUnit: params.rateUnit ?? RateUnit.PerVisit,
      sortOrder: params.sortOrder ?? 0,
      isActive: params.isActive ?? true,
      rates: VisitFormat.cleanRates(params.rates ?? []),
      createdAt: params.now,
      updatedAt: params.now,
    });
  }

  public static rehydrate(id: string, props: VisitFormatProps): VisitFormat {
    return new VisitFormat(id, props);
  }

  public edit(
    fields: {
      name?: string;
      description?: string | null;
      durationMinutes?: number | null;
      rateUnit?: RateUnit;
      sortOrder?: number;
      isActive?: boolean;
      rates?: FormatRate[];
    },
    now: Date,
  ): void {
    if (fields.name !== undefined) {
      this.props.name = VisitFormat.cleanName(fields.name);
    }
    if (fields.description !== undefined) {
      this.props.description = VisitFormat.cleanDescription(fields.description);
    }
    if (fields.durationMinutes !== undefined) {
      this.props.durationMinutes = VisitFormat.cleanDuration(fields.durationMinutes);
    }
    if (fields.rateUnit !== undefined) {
      this.props.rateUnit = fields.rateUnit;
    }
    if (fields.sortOrder !== undefined) {
      this.props.sortOrder = VisitFormat.cleanSortOrder(fields.sortOrder);
    }
    if (fields.isActive !== undefined) {
      this.props.isActive = fields.isActive;
    }
    if (fields.rates !== undefined) {
      this.props.rates = VisitFormat.cleanRates(fields.rates);
    }
    this.props.updatedAt = now;
  }

  private static cleanName(value: string): string {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      throw new ValidationException('Visit format name is required');
    }
    if (trimmed.length > MAX_NAME) {
      throw new ValidationException('Visit format name exceeds the maximum length');
    }
    return trimmed;
  }

  private static cleanDescription(value: string | null | undefined): string | null {
    if (value === null || value === undefined) {
      return null;
    }
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return null;
    }
    if (trimmed.length > MAX_DESCRIPTION) {
      throw new ValidationException('Visit format description exceeds the maximum length');
    }
    return trimmed;
  }

  private static cleanDuration(value: number | null): number | null {
    if (value === null) {
      return null;
    }
    if (!Number.isInteger(value) || value <= 0 || value > MAX_DURATION_MINUTES) {
      throw new ValidationException('Duration must be a positive number of minutes');
    }
    return value;
  }

  private static cleanSortOrder(value: number): number {
    if (!Number.isInteger(value) || value < 0) {
      throw new ValidationException('Sort order must be a non negative whole number');
    }
    return value;
  }

  private static cleanRates(rates: FormatRate[]): FormatRate[] {
    const byCurrency = new Map<Currency, number>();
    for (const rate of rates) {
      if (!Number.isInteger(rate.baseRateMinor) || rate.baseRateMinor < 0) {
        throw new ValidationException('A base rate must be a non negative whole number');
      }
      if (byCurrency.has(rate.currency)) {
        throw new ValidationException('Only one rate per currency is allowed');
      }
      byCurrency.set(rate.currency, rate.baseRateMinor);
    }
    return [...byCurrency.entries()].map(([currency, baseRateMinor]) => ({
      currency,
      baseRateMinor,
    }));
  }

  public get name(): string {
    return this.props.name;
  }

  public get description(): string | null {
    return this.props.description;
  }

  public get durationMinutes(): number | null {
    return this.props.durationMinutes;
  }

  public get rateUnit(): RateUnit {
    return this.props.rateUnit;
  }

  public get sortOrder(): number {
    return this.props.sortOrder;
  }

  public get isActive(): boolean {
    return this.props.isActive;
  }

  public get rates(): ReadonlyArray<FormatRate> {
    return this.props.rates;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }

  public get updatedAt(): Date {
    return this.props.updatedAt;
  }
}
