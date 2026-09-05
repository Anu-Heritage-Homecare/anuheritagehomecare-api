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

interface ProfilePreferencesProps {
  notifications: NotificationPreferences;
  language: string;
  preferredContactMethod: PreferredContactMethod;
  updatedAt: Date;
}

const SUPPORTED_LANGUAGES = ['en'];
const CONTACT_METHODS: PreferredContactMethod[] = ['EMAIL', 'PHONE', 'SMS'];

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

  public get notifications(): NotificationPreferences {
    return { ...this.props.notifications };
  }

  public get language(): string {
    return this.props.language;
  }

  public get preferredContactMethod(): PreferredContactMethod {
    return this.props.preferredContactMethod;
  }

  public get updatedAt(): Date {
    return this.props.updatedAt;
  }
}
