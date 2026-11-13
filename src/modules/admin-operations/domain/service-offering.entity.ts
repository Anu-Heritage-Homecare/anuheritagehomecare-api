import { AggregateRoot } from '@shared/domain/aggregate-root.base';
import { ValidationException } from '@shared/domain/domain-exception';

const MAX_NAME = 160;
const MAX_DESCRIPTION = 300;

interface ServiceOfferingProps {
  name: string;
  description: string | null;
  isEnabled: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

/** A support service the organization offers, with an enable/disable toggle. */
export class ServiceOffering extends AggregateRoot<string> {
  private props: ServiceOfferingProps;

  private constructor(id: string, props: ServiceOfferingProps) {
    super(id);
    this.props = props;
  }

  public static create(params: {
    id: string;
    name: string;
    description?: string | null;
    isEnabled?: boolean;
    sortOrder?: number;
    now: Date;
  }): ServiceOffering {
    return new ServiceOffering(params.id, {
      name: ServiceOffering.cleanName(params.name),
      description: ServiceOffering.cleanDescription(params.description),
      isEnabled: params.isEnabled ?? true,
      sortOrder: params.sortOrder ?? 0,
      createdAt: params.now,
      updatedAt: params.now,
    });
  }

  public static rehydrate(id: string, props: ServiceOfferingProps): ServiceOffering {
    return new ServiceOffering(id, props);
  }

  public edit(
    fields: { name?: string; description?: string | null; isEnabled?: boolean; sortOrder?: number },
    now: Date,
  ): void {
    if (fields.name !== undefined) {
      this.props.name = ServiceOffering.cleanName(fields.name);
    }
    if (fields.description !== undefined) {
      this.props.description = ServiceOffering.cleanDescription(fields.description);
    }
    if (fields.isEnabled !== undefined) {
      this.props.isEnabled = fields.isEnabled;
    }
    if (fields.sortOrder !== undefined) {
      this.props.sortOrder = ServiceOffering.cleanSortOrder(fields.sortOrder);
    }
    this.props.updatedAt = now;
  }

  private static cleanName(value: string): string {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      throw new ValidationException('Service name is required');
    }
    if (trimmed.length > MAX_NAME) {
      throw new ValidationException('Service name exceeds the maximum length');
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
      throw new ValidationException('Service description exceeds the maximum length');
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

  public get description(): string | null {
    return this.props.description;
  }

  public get isEnabled(): boolean {
    return this.props.isEnabled;
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
