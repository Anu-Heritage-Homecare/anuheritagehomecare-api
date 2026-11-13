import { AggregateRoot } from '@shared/domain/aggregate-root.base';
import { Currency } from '@shared/domain/currency.enum';
import { ValidationException } from '@shared/domain/domain-exception';

/** One day of the weekly opening schedule. Minutes are measured from midnight. */
export interface DayHours {
  /** 0 = Sunday through 6 = Saturday (JavaScript getDay convention). */
  dayOfWeek: number;
  isOpen: boolean;
  openMinute: number;
  closeMinute: number;
}

const MINUTES_IN_DAY = 24 * 60;
const MAX_NAME = 200;
const MAX_REG = 80;
const MAX_ADDRESS = 400;
const MAX_TIMEZONE = 80;
const MAX_LANGUAGE = 80;
const MAX_DATE_FORMAT = 40;

/** A sensible default week (all days closed, 9am to 5pm preset) for an unconfigured org. */
export const DEFAULT_BUSINESS_HOURS: DayHours[] = Array.from({ length: 7 }, (_unused, day) => ({
  dayOfWeek: day,
  isOpen: false,
  openMinute: 540,
  closeMinute: 1020,
}));

function validateDayHours(day: DayHours): void {
  for (const minute of [day.openMinute, day.closeMinute]) {
    if (!Number.isInteger(minute) || minute < 0 || minute > MINUTES_IN_DAY) {
      throw new ValidationException('Opening times must be minutes from midnight (0 to 1440)');
    }
  }
  if (day.isOpen && day.openMinute >= day.closeMinute) {
    throw new ValidationException('A day that is open must close after it opens');
  }
}

/**
 * Validate a full seven day weekly schedule and return it sorted by day. Every day
 * (0 Sunday to 6 Saturday) must appear exactly once. Shared by the organization and
 * each branch, which both carry a weekly opening schedule.
 */
export function normalizeWeeklyHours(days: DayHours[]): DayHours[] {
  const seen = new Set<number>();
  for (const day of days) {
    if (!Number.isInteger(day.dayOfWeek) || day.dayOfWeek < 0 || day.dayOfWeek > 6) {
      throw new ValidationException('dayOfWeek must be between 0 and 6');
    }
    if (seen.has(day.dayOfWeek)) {
      throw new ValidationException('Each day of the week may appear only once');
    }
    seen.add(day.dayOfWeek);
    validateDayHours(day);
  }
  if (seen.size !== 7) {
    throw new ValidationException('The schedule must cover all seven days of the week');
  }
  return [...days]
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
    .map((day) => ({
      dayOfWeek: day.dayOfWeek,
      isOpen: day.isOpen,
      openMinute: day.openMinute,
      closeMinute: day.closeMinute,
    }));
}

interface OrganizationProps {
  legalName: string | null;
  businessRegNumber: string | null;
  registeredAddress: string | null;
  timezone: string | null;
  systemLanguage: string | null;
  currency: Currency;
  dateFormat: string | null;
  businessHours: DayHours[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Organization aggregate root: the single back office that runs the service. There
 * is exactly one row (a singleton, keyed on ORGANIZATION_SINGLETON_ID); it carries
 * the legal identity, the billing currency, the regional display preferences and
 * the weekly opening schedule. Branches and emergency contacts are their own
 * entities referencing this organization.
 */
export class Organization extends AggregateRoot<string> {
  private props: OrganizationProps;

  private constructor(id: string, props: OrganizationProps) {
    super(id);
    this.props = props;
  }

  /** An empty, unconfigured organization (shown before the first edit saves one). */
  public static empty(id: string, now: Date): Organization {
    return new Organization(id, {
      legalName: null,
      businessRegNumber: null,
      registeredAddress: null,
      timezone: null,
      systemLanguage: null,
      currency: Currency.NigerianNaira,
      dateFormat: null,
      businessHours: DEFAULT_BUSINESS_HOURS.map((day) => ({ ...day })),
      createdAt: now,
      updatedAt: now,
    });
  }

  public static rehydrate(id: string, props: OrganizationProps): Organization {
    return new Organization(id, props);
  }

  /** Revise the profile details (only the provided fields change; null clears one). */
  public editProfile(
    fields: {
      legalName?: string | null;
      businessRegNumber?: string | null;
      registeredAddress?: string | null;
      timezone?: string | null;
      systemLanguage?: string | null;
      currency?: Currency;
      dateFormat?: string | null;
    },
    now: Date,
  ): void {
    if (fields.legalName !== undefined) {
      this.props.legalName = Organization.cleanText(fields.legalName, MAX_NAME, 'Legal name');
    }
    if (fields.businessRegNumber !== undefined) {
      this.props.businessRegNumber = Organization.cleanText(
        fields.businessRegNumber,
        MAX_REG,
        'Business registration number',
      );
    }
    if (fields.registeredAddress !== undefined) {
      this.props.registeredAddress = Organization.cleanText(
        fields.registeredAddress,
        MAX_ADDRESS,
        'Registered address',
      );
    }
    if (fields.timezone !== undefined) {
      this.props.timezone = Organization.cleanText(fields.timezone, MAX_TIMEZONE, 'Timezone');
    }
    if (fields.systemLanguage !== undefined) {
      this.props.systemLanguage = Organization.cleanText(
        fields.systemLanguage,
        MAX_LANGUAGE,
        'System language',
      );
    }
    if (fields.currency !== undefined) {
      this.props.currency = fields.currency;
    }
    if (fields.dateFormat !== undefined) {
      this.props.dateFormat = Organization.cleanText(
        fields.dateFormat,
        MAX_DATE_FORMAT,
        'Date format',
      );
    }
    this.props.updatedAt = now;
  }

  /** Replace the whole weekly schedule. Every day of the week must be supplied once. */
  public setBusinessHours(days: DayHours[], now: Date): void {
    this.props.businessHours = normalizeWeeklyHours(days);
    this.props.updatedAt = now;
  }

  private static cleanText(value: string | null, max: number, label: string): string | null {
    if (value === null) {
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

  public get legalName(): string | null {
    return this.props.legalName;
  }

  public get businessRegNumber(): string | null {
    return this.props.businessRegNumber;
  }

  public get registeredAddress(): string | null {
    return this.props.registeredAddress;
  }

  public get timezone(): string | null {
    return this.props.timezone;
  }

  public get systemLanguage(): string | null {
    return this.props.systemLanguage;
  }

  public get currency(): Currency {
    return this.props.currency;
  }

  public get dateFormat(): string | null {
    return this.props.dateFormat;
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
