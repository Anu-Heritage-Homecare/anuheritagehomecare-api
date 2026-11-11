import { AggregateRoot } from '@shared/domain/aggregate-root.base';
import { ValidationException } from '@shared/domain/domain-exception';
import { BranchStatus } from './branch-status.enum';
import { DayHours, normalizeWeeklyHours } from './organization.entity';

const MAX_NAME = 200;
const MAX_ADDRESS_LINE = 200;
const MAX_CITY = 120;
const MAX_STATE = 120;
const MAX_PHONE = 40;

/** The default week for a new branch: open Monday to Saturday 8am to 6pm, closed Sunday. */
export const BRANCH_DEFAULT_BUSINESS_HOURS: DayHours[] = Array.from({ length: 7 }, (_u, day) => ({
  dayOfWeek: day,
  isOpen: day !== 0,
  openMinute: 480,
  closeMinute: 1080,
}));

interface BranchProps {
  name: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  phone: string | null;
  managerId: string | null;
  /** Resolved from the manager user at read time; not persisted on the branch row. */
  managerName: string | null;
  status: BranchStatus;
  businessHours: DayHours[];
  createdAt: Date;
  updatedAt: Date;
}

/** A branch (physical office) of the organization, with its own status, manager and hours. */
export class OrganizationBranch extends AggregateRoot<string> {
  private props: BranchProps;

  private constructor(id: string, props: BranchProps) {
    super(id);
    this.props = props;
  }

  public static create(params: {
    id: string;
    name: string;
    addressLine1: string;
    addressLine2?: string | null;
    city: string;
    state: string;
    phone?: string | null;
    managerId?: string | null;
    status?: BranchStatus;
    businessHours?: DayHours[];
    now: Date;
  }): OrganizationBranch {
    return new OrganizationBranch(params.id, {
      name: OrganizationBranch.cleanRequired(params.name, MAX_NAME, 'Branch name'),
      addressLine1: OrganizationBranch.cleanRequired(
        params.addressLine1,
        MAX_ADDRESS_LINE,
        'Address line 1',
      ),
      addressLine2: OrganizationBranch.cleanOptional(
        params.addressLine2,
        MAX_ADDRESS_LINE,
        'Address line 2',
      ),
      city: OrganizationBranch.cleanRequired(params.city, MAX_CITY, 'City'),
      state: OrganizationBranch.cleanRequired(params.state, MAX_STATE, 'State'),
      phone: OrganizationBranch.cleanOptional(params.phone, MAX_PHONE, 'Phone'),
      managerId: params.managerId ?? null,
      managerName: null,
      status: params.status ?? BranchStatus.Active,
      businessHours: normalizeWeeklyHours(params.businessHours ?? BRANCH_DEFAULT_BUSINESS_HOURS),
      createdAt: params.now,
      updatedAt: params.now,
    });
  }

  public static rehydrate(id: string, props: BranchProps): OrganizationBranch {
    return new OrganizationBranch(id, props);
  }

  public edit(
    fields: {
      name?: string;
      addressLine1?: string;
      addressLine2?: string | null;
      city?: string;
      state?: string;
      phone?: string | null;
      managerId?: string | null;
      status?: BranchStatus;
      businessHours?: DayHours[];
    },
    now: Date,
  ): void {
    if (fields.name !== undefined) {
      this.props.name = OrganizationBranch.cleanRequired(fields.name, MAX_NAME, 'Branch name');
    }
    if (fields.addressLine1 !== undefined) {
      this.props.addressLine1 = OrganizationBranch.cleanRequired(
        fields.addressLine1,
        MAX_ADDRESS_LINE,
        'Address line 1',
      );
    }
    if (fields.addressLine2 !== undefined) {
      this.props.addressLine2 = OrganizationBranch.cleanOptional(
        fields.addressLine2,
        MAX_ADDRESS_LINE,
        'Address line 2',
      );
    }
    if (fields.city !== undefined) {
      this.props.city = OrganizationBranch.cleanRequired(fields.city, MAX_CITY, 'City');
    }
    if (fields.state !== undefined) {
      this.props.state = OrganizationBranch.cleanRequired(fields.state, MAX_STATE, 'State');
    }
    if (fields.phone !== undefined) {
      this.props.phone = OrganizationBranch.cleanOptional(fields.phone, MAX_PHONE, 'Phone');
    }
    if (fields.managerId !== undefined) {
      this.props.managerId = fields.managerId;
    }
    if (fields.status !== undefined) {
      this.props.status = fields.status;
    }
    if (fields.businessHours !== undefined) {
      this.props.businessHours = normalizeWeeklyHours(fields.businessHours);
    }
    this.props.updatedAt = now;
  }

  private static cleanRequired(value: string, max: number, label: string): string {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      throw new ValidationException(`${label} is required`);
    }
    if (trimmed.length > max) {
      throw new ValidationException(`${label} exceeds the maximum length`);
    }
    return trimmed;
  }

  private static cleanOptional(
    value: string | null | undefined,
    max: number,
    label: string,
  ): string | null {
    if (value === null || value === undefined) {
      return null;
    }
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return null;
    }
    if (trimmed.length > max) {
      throw new ValidationException(`${label} exceeds the maximum length`);
    }
    return trimmed;
  }

  public get name(): string {
    return this.props.name;
  }

  public get addressLine1(): string {
    return this.props.addressLine1;
  }

  public get addressLine2(): string | null {
    return this.props.addressLine2;
  }

  public get city(): string {
    return this.props.city;
  }

  public get state(): string {
    return this.props.state;
  }

  public get phone(): string | null {
    return this.props.phone;
  }

  public get managerId(): string | null {
    return this.props.managerId;
  }

  public get managerName(): string | null {
    return this.props.managerName;
  }

  public get status(): BranchStatus {
    return this.props.status;
  }

  public get businessHours(): ReadonlyArray<DayHours> {
    return this.props.businessHours;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }

  public get updatedAt(): Date {
    return this.props.updatedAt;
  }
}
