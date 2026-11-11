import { AggregateRoot } from '@shared/domain/aggregate-root.base';
import { ValidationException } from '@shared/domain/domain-exception';

const MAX_NAME = 80;
const MAX_DESCRIPTION = 200;
const MAX_NET_DAYS = 365;

interface PaymentTermProps {
  name: string;
  netDays: number | null;
  isDefault: boolean;
  isActive: boolean;
  isCustom: boolean;
  description: string | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * A configurable payment term (Net 15, Net 30, Custom). A custom term carries no
 * fixed net days (parameters are set per account). Default state is managed by the
 * use case so exactly one term is the default.
 */
export class BillingPaymentTerm extends AggregateRoot<string> {
  private props: PaymentTermProps;

  private constructor(id: string, props: PaymentTermProps) {
    super(id);
    this.props = props;
  }

  public static create(params: {
    id: string;
    name: string;
    netDays?: number | null;
    isCustom?: boolean;
    isActive?: boolean;
    isDefault?: boolean;
    description?: string | null;
    sortOrder?: number;
    now: Date;
  }): BillingPaymentTerm {
    const isCustom = params.isCustom ?? false;
    return new BillingPaymentTerm(params.id, {
      name: BillingPaymentTerm.cleanName(params.name),
      netDays: BillingPaymentTerm.cleanNetDays(params.netDays ?? null, isCustom),
      isDefault: params.isDefault ?? false,
      isActive: params.isActive ?? true,
      isCustom,
      description: BillingPaymentTerm.cleanDescription(params.description),
      sortOrder: params.sortOrder ?? 0,
      createdAt: params.now,
      updatedAt: params.now,
    });
  }

  public static rehydrate(id: string, props: PaymentTermProps): BillingPaymentTerm {
    return new BillingPaymentTerm(id, props);
  }

  public edit(
    fields: {
      name?: string;
      netDays?: number | null;
      isActive?: boolean;
      isCustom?: boolean;
      description?: string | null;
      sortOrder?: number;
    },
    now: Date,
  ): void {
    if (fields.isCustom !== undefined) {
      this.props.isCustom = fields.isCustom;
    }
    if (fields.name !== undefined) {
      this.props.name = BillingPaymentTerm.cleanName(fields.name);
    }
    if (fields.netDays !== undefined) {
      this.props.netDays = BillingPaymentTerm.cleanNetDays(fields.netDays, this.props.isCustom);
    } else if (fields.isCustom === true) {
      this.props.netDays = null;
    }
    if (fields.isActive !== undefined) {
      this.props.isActive = fields.isActive;
    }
    if (fields.description !== undefined) {
      this.props.description = BillingPaymentTerm.cleanDescription(fields.description);
    }
    if (fields.sortOrder !== undefined) {
      this.props.sortOrder = BillingPaymentTerm.cleanSortOrder(fields.sortOrder);
    }
    this.props.updatedAt = now;
  }

  /** Set or clear the default flag (orchestrated by the use case across terms). */
  public setDefault(isDefault: boolean, now: Date): void {
    this.props.isDefault = isDefault;
    this.props.updatedAt = now;
  }

  private static cleanName(value: string): string {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      throw new ValidationException('Term name is required');
    }
    if (trimmed.length > MAX_NAME) {
      throw new ValidationException('Term name exceeds the maximum length');
    }
    return trimmed;
  }

  private static cleanNetDays(value: number | null, isCustom: boolean): number | null {
    if (isCustom) {
      return null;
    }
    if (value === null) {
      throw new ValidationException('A non custom term must have a net days value');
    }
    if (!Number.isInteger(value) || value < 0 || value > MAX_NET_DAYS) {
      throw new ValidationException(
        `Net days must be a whole number between 0 and ${MAX_NET_DAYS}`,
      );
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
      throw new ValidationException('Term description exceeds the maximum length');
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

  public get netDays(): number | null {
    return this.props.netDays;
  }

  public get isDefault(): boolean {
    return this.props.isDefault;
  }

  public get isActive(): boolean {
    return this.props.isActive;
  }

  public get isCustom(): boolean {
    return this.props.isCustom;
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
