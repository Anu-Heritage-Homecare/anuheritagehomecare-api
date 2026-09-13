/**
 * A family contact's preferred way to be reached, shown on their card so staff pick
 * the right channel.
 */
export enum FamilyPreferredContactMethod {
  Phone = 'PHONE',
  AppMessage = 'APP_MESSAGE',
  SmsText = 'SMS_TEXT',
  VideoCall = 'VIDEO_CALL',
  Email = 'EMAIL',
}

/** Every valid preferred method, used to validate incoming values at the boundary. */
export const ALL_FAMILY_PREFERRED_CONTACT_METHODS: readonly FamilyPreferredContactMethod[] =
  Object.values(FamilyPreferredContactMethod);
