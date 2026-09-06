import { Entity } from '@shared/domain/entity.base';
import { ValidationException } from '@shared/domain/domain-exception';

/**
 * The owner's per category notification switches, mirroring the Notifications
 * screen exactly: four Care Updates, three Communications, two Billing and
 * Payments, and one Marketing toggle. Each governs whether a class of event
 * reaches the owner. Marketing is off by default; every other category is on.
 */
export interface NotificationPreferences {
  // Care Updates
  visitUpdates: boolean;
  caregiverUpdates: boolean;
  healthAlerts: boolean;
  medicationReminders: boolean;
  // Communications
  messages: boolean;
  carePlanUpdates: boolean;
  announcements: boolean;
  // Billing and Payments
  invoicesAndPayments: boolean;
  paymentReminders: boolean;
  // Marketing
  marketingAndOffers: boolean;
}

/** The ordered keys of every notification category, for exhaustive iteration. */
export const NOTIFICATION_CATEGORY_KEYS: readonly (keyof NotificationPreferences)[] = [
  'visitUpdates',
  'caregiverUpdates',
  'healthAlerts',
  'medicationReminders',
  'messages',
  'carePlanUpdates',
  'announcements',
  'invoicesAndPayments',
  'paymentReminders',
  'marketingAndOffers',
];

export type PreferredContactMethod = 'EMAIL' | 'PHONE' | 'SMS';

/** App display theme. SYSTEM follows the device setting. */
export type Theme = 'LIGHT' | 'DARK' | 'SYSTEM';
/** How dates are formatted in the app. */
export type DateFormat = 'MMM_DD_YYYY' | 'DD_MM_YYYY' | 'MM_DD_YYYY' | 'YYYY_MM_DD';
/** 12 hour (3:45 PM) or 24 hour (15:45) clock. */
export type TimeFormat = 'TWELVE_HOUR' | 'TWENTY_FOUR_HOUR';
/** Base text size for accessibility. */
export type TextSize = 'SMALL' | 'MEDIUM' | 'LARGE';

interface ProfilePreferencesProps {
  notifications: NotificationPreferences;
  language: string;
  preferredContactMethod: PreferredContactMethod;
  theme: Theme;
  dateFormat: DateFormat;
  timeFormat: TimeFormat;
  soundEnabled: boolean;
  textSize: TextSize;
  updatedAt: Date;
}

const SUPPORTED_LANGUAGES = ['en'];
const CONTACT_METHODS: PreferredContactMethod[] = ['EMAIL', 'PHONE', 'SMS'];
const THEMES: Theme[] = ['LIGHT', 'DARK', 'SYSTEM'];
const DATE_FORMATS: DateFormat[] = ['MMM_DD_YYYY', 'DD_MM_YYYY', 'MM_DD_YYYY', 'YYYY_MM_DD'];
const TIME_FORMATS: TimeFormat[] = ['TWELVE_HOUR', 'TWENTY_FOUR_HOUR'];
const TEXT_SIZES: TextSize[] = ['SMALL', 'MEDIUM', 'LARGE'];

/**
 * A family owner's notification and app preferences, keyed by their user id. The
 * entity id is the user id (one row per user). New users get sensible defaults
 * (every notification category on except Marketing, English) until they change them.
 */
export class ProfilePreferences extends Entity<string> {
  private props: ProfilePreferencesProps;

  private constructor(userId: string, props: ProfilePreferencesProps) {
    super(userId);
    this.props = props;
  }

  public static default(userId: string, now: Date): ProfilePreferences {
    return new ProfilePreferences(userId, {
      notifications: {
        visitUpdates: true,
        caregiverUpdates: true,
        healthAlerts: true,
        medicationReminders: true,
        messages: true,
        carePlanUpdates: true,
        announcements: true,
        invoicesAndPayments: true,
        paymentReminders: true,
        marketingAndOffers: false,
      },
      language: 'en',
      preferredContactMethod: 'EMAIL',
      theme: 'LIGHT',
      dateFormat: 'MMM_DD_YYYY',
      timeFormat: 'TWELVE_HOUR',
      soundEnabled: true,
      textSize: 'MEDIUM',
      updatedAt: now,
    });
  }

  public static rehydrate(userId: string, props: ProfilePreferencesProps): ProfilePreferences {
    return new ProfilePreferences(userId, props);
  }

  public setNotifications(notifications: NotificationPreferences, now: Date): void {
    this.props.notifications = { ...notifications };
    this.props.updatedAt = now;
  }

  public setLanguage(language: string, now: Date): void {
    const normalised = language.trim().toLowerCase();
    if (!SUPPORTED_LANGUAGES.includes(normalised)) {
      throw new ValidationException(`Language ${language} is not supported`);
    }
    this.props.language = normalised;
    this.props.updatedAt = now;
  }

  public setPreferredContactMethod(method: string, now: Date): void {
    const normalised = method.trim().toUpperCase() as PreferredContactMethod;
    if (!CONTACT_METHODS.includes(normalised)) {
      throw new ValidationException('Preferred contact method must be EMAIL, PHONE or SMS');
    }
    this.props.preferredContactMethod = normalised;
    this.props.updatedAt = now;
  }

  public setTheme(theme: string, now: Date): void {
    const normalised = theme.trim().toUpperCase() as Theme;
    if (!THEMES.includes(normalised)) {
      throw new ValidationException('Theme must be LIGHT, DARK or SYSTEM');
    }
    this.props.theme = normalised;
    this.props.updatedAt = now;
  }

  public setDateFormat(dateFormat: string, now: Date): void {
    const normalised = dateFormat.trim().toUpperCase() as DateFormat;
    if (!DATE_FORMATS.includes(normalised)) {
      throw new ValidationException('Unsupported date format');
    }
    this.props.dateFormat = normalised;
    this.props.updatedAt = now;
  }

  public setTimeFormat(timeFormat: string, now: Date): void {
    const normalised = timeFormat.trim().toUpperCase() as TimeFormat;
    if (!TIME_FORMATS.includes(normalised)) {
      throw new ValidationException('Time format must be TWELVE_HOUR or TWENTY_FOUR_HOUR');
    }
    this.props.timeFormat = normalised;
    this.props.updatedAt = now;
  }

  public setSoundEnabled(enabled: boolean, now: Date): void {
    this.props.soundEnabled = enabled;
    this.props.updatedAt = now;
  }

  public setTextSize(textSize: string, now: Date): void {
    const normalised = textSize.trim().toUpperCase() as TextSize;
    if (!TEXT_SIZES.includes(normalised)) {
      throw new ValidationException('Text size must be SMALL, MEDIUM or LARGE');
    }
    this.props.textSize = normalised;
    this.props.updatedAt = now;
  }

  public get notifications(): NotificationPreferences {
    return { ...this.props.notifications };
  }

  public get language(): string {
    return this.props.language;
  }

  public get preferredContactMethod(): PreferredContactMethod {
    return this.props.preferredContactMethod;
  }

  public get theme(): Theme {
    return this.props.theme;
  }

  public get dateFormat(): DateFormat {
    return this.props.dateFormat;
  }

  public get timeFormat(): TimeFormat {
    return this.props.timeFormat;
  }

  public get soundEnabled(): boolean {
    return this.props.soundEnabled;
  }

  public get textSize(): TextSize {
    return this.props.textSize;
  }

  public get updatedAt(): Date {
    return this.props.updatedAt;
  }
}
