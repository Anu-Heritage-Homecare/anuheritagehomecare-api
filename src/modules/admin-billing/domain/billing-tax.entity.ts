import { AggregateRoot } from '@shared/domain/aggregate-root.base';
import { ValidationException } from '@shared/domain/domain-exception';
import { TaxScope } from './tax-scope.enum';

const MAX_NAME = 80;
const MAX_DESCRIPTION = 200;
const MAX_BASIS_POINTS = 10_000; // 100%

interface BillingTaxProps {
  name: string;
  rateBasisPoints: number;
  scope: TaxScope;
  isActive: boolean;
  description: string | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

/** A configurable tax (VAT, WHT). The rate is in basis points (750 = 7.5%). */
export class BillingTax extends AggregateRoot<string> {
  private props: BillingTaxProps;

  private constructor(id: string, props: BillingTaxProps) {
    super(id);
    this.props = props;
  }

  public static create(params: {
    id: string;
    name: string;
    rateBasisPoints: number;
    scope: TaxScope;
    isActive?: boolean;
    description?: string | null;
    sortOrder?: number;
    now: Date;
  }): BillingTax {
    return new BillingTax(params.id, {
      name: BillingTax.cleanName(params.name),
      rateBasisPoints: BillingTax.cleanRate(params.rateBasisPoints),
      scope: params.scope,
      isActive: params.isActive ?? true,
      description: BillingTax.cleanDescription(params.description),
      sortOrder: params.sortOrder ?? 0,
      createdAt: params.now,
      updatedAt: params.now,
    });
  }

  public static rehydrate(id: string, props: BillingTaxProps): BillingTax {
    return new BillingTax(id, props);
  }

  public edit(
    fields: {
      name?: string;
      rateBasisPoints?: number;
      scope?: TaxScope;
      isActive?: boolean;
      description?: string | null;
      sortOrder?: number;
    },
    now: Date,
  ): void {
    if (fields.name !== undefined) {
      this.props.name = BillingTax.cleanName(fields.name);
    }
    if (fields.rateBasisPoints !== undefined) {
      this.props.rateBasisPoints = BillingTax.cleanRate(fields.rateBasisPoints);
    }
    if (fields.scope !== undefined) {
      this.props.scope = fields.scope;
    }
    if (fields.isActive !== undefined) {
      this.props.isActive = fields.isActive;
    }
    if (fields.description !== undefined) {
      this.props.description = BillingTax.cleanDescription(fields.description);
    }
    if (fields.sortOrder !== undefined) {
      this.props.sortOrder = BillingTax.cleanSortOrder(fields.sortOrder);
    }
    this.props.updatedAt = now;
  }

  private static cleanName(value: string): string {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      throw new ValidationException('Tax name is required');
    }
    if (trimmed.length > MAX_NAME) {
      throw new ValidationException('Tax name exceeds the maximum length');
    }
    return trimmed;
  }

  private static cleanRate(value: number): number {
    if (!Number.isInteger(value) || value < 0 || value > MAX_BASIS_POINTS) {
      throw new ValidationException('The tax rate must be between 0 and 10000 basis points');
    }
    return value;
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
      throw new ValidationException('Tax description exceeds the maximum length');
    }
    return trimmed;
  }

  private static cleanSortOrder(value: number): number {
    if (!Number.isInteger(value) || value < 0) {
      throw new ValidationException('Sort order must be a non negative whole number');
    }
    return value;
  }

  public get name(): string {
    return this.props.name;
  }

  public get rateBasisPoints(): number {
    return this.props.rateBasisPoints;
  }

  public get scope(): TaxScope {
    return this.props.scope;
  }

  public get isActive(): boolean {
    return this.props.isActive;
  }

  public get description(): string | null {
    return this.props.description;
  }

  public get sortOrder(): number {
    return this.props.sortOrder;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }

  public get updatedAt(): Date {
    return this.props.updatedAt;
  }
}
