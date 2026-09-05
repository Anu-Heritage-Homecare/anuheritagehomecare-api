import { ProfilePreferences as PrismaProfilePreferences } from '@prisma/client';
import { ProfilePreferences } from '../../domain/profile-preferences.entity';

/** Translates between the Prisma profile preferences row and the aggregate. */
export class ProfilePreferencesMapper {
  static toDomain(row: PrismaProfilePreferences): ProfilePreferences {
    return ProfilePreferences.rehydrate(row.userId, {
      notifications: {
        push: row.pushEnabled,
        email: row.emailEnabled,
        sms: row.smsEnabled,
        visitUpdates: row.visitUpdates,
        careAlerts: row.careAlerts,
        billingAlerts: row.billingAlerts,
        messageAlerts: row.messageAlerts,
      },
      language: row.language,
      updatedAt: row.updatedAt,
    });
  }

  static toPersistence(
    preferences: ProfilePreferences,
  ): Omit<PrismaProfilePreferences, 'createdAt' | 'updatedAt'> {
    const notifications = preferences.notifications;
    return {
      userId: preferences.id,
      pushEnabled: notifications.push,
      emailEnabled: notifications.email,
      smsEnabled: notifications.sms,
      visitUpdates: notifications.visitUpdates,
      careAlerts: notifications.careAlerts,
      billingAlerts: notifications.billingAlerts,
      messageAlerts: notifications.messageAlerts,
      language: preferences.language,
    };
  }
}
