import { ProfilePreferences as PrismaProfilePreferences } from '@prisma/client';
import { ProfilePreferences } from '../../domain/profile-preferences.entity';

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
    };
  }
}
