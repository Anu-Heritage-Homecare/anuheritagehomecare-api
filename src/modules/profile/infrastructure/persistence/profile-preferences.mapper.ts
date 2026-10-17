import { ProfilePreferences as PrismaProfilePreferences } from '@prisma/client';
import {
  DateFormat,
  ProfilePreferences,
  TextSize,
  Theme,
  TimeFormat,
} from '../../domain/profile-preferences.entity';

const THEMES: Theme[] = ['LIGHT', 'DARK', 'SYSTEM'];
const DATE_FORMATS: DateFormat[] = ['MMM_DD_YYYY', 'DD_MM_YYYY', 'MM_DD_YYYY', 'YYYY_MM_DD'];
const TIME_FORMATS: TimeFormat[] = ['TWELVE_HOUR', 'TWENTY_FOUR_HOUR'];
const TEXT_SIZES: TextSize[] = ['SMALL', 'MEDIUM', 'LARGE'];

function oneOf<T extends string>(value: string, allowed: T[], fallback: T): T {
  return (allowed as string[]).includes(value) ? (value as T) : fallback;
}

/** Translates between the Prisma profile preferences row and the aggregate. */
export class ProfilePreferencesMapper {
  static toDomain(row: PrismaProfilePreferences): ProfilePreferences {
    return ProfilePreferences.rehydrate(row.userId, {
      notifications: {
        visitUpdates: row.visitUpdates,
        caregiverUpdates: row.caregiverUpdates,
        healthAlerts: row.healthAlerts,
        medicationReminders: row.medicationReminders,
        messages: row.messages,
        carePlanUpdates: row.carePlanUpdates,
        announcements: row.announcements,
        invoicesAndPayments: row.invoicesAndPayments,
        paymentReminders: row.paymentReminders,
        marketingAndOffers: row.marketingAndOffers,
      },
      language: row.language,
      preferredContactMethod: ProfilePreferencesMapper.toContactMethod(row.preferredContactMethod),
      theme: oneOf(row.theme, THEMES, 'LIGHT'),
      dateFormat: oneOf(row.dateFormat, DATE_FORMATS, 'MMM_DD_YYYY'),
      timeFormat: oneOf(row.timeFormat, TIME_FORMATS, 'TWELVE_HOUR'),
      soundEnabled: row.soundEnabled,
      textSize: oneOf(row.textSize, TEXT_SIZES, 'MEDIUM'),
      locationServicesEnabled: row.locationServicesEnabled,
      pushNotificationsEnabled: row.pushNotificationsEnabled,
      updatedAt: row.updatedAt,
    });
  }

  private static toContactMethod(value: string): 'EMAIL' | 'PHONE' | 'SMS' {
    return value === 'PHONE' || value === 'SMS' ? value : 'EMAIL';
  }

  static toPersistence(
    preferences: ProfilePreferences,
  ): Omit<PrismaProfilePreferences, 'createdAt' | 'updatedAt'> {
    const notifications = preferences.notifications;
    return {
      userId: preferences.id,
      visitUpdates: notifications.visitUpdates,
      caregiverUpdates: notifications.caregiverUpdates,
      healthAlerts: notifications.healthAlerts,
      medicationReminders: notifications.medicationReminders,
      messages: notifications.messages,
      carePlanUpdates: notifications.carePlanUpdates,
      announcements: notifications.announcements,
      invoicesAndPayments: notifications.invoicesAndPayments,
      paymentReminders: notifications.paymentReminders,
      marketingAndOffers: notifications.marketingAndOffers,
      language: preferences.language,
      preferredContactMethod: preferences.preferredContactMethod,
      theme: preferences.theme,
      dateFormat: preferences.dateFormat,
      timeFormat: preferences.timeFormat,
      soundEnabled: preferences.soundEnabled,
      textSize: preferences.textSize,
      locationServicesEnabled: preferences.locationServicesEnabled,
      pushNotificationsEnabled: preferences.pushNotificationsEnabled,
    };
  }
}
