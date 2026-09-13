/**
 * The channel of a logged interaction with a family contact. Drives the type badge in
 * the Recent Communication Log.
 */
export enum FamilyCommunicationType {
  AppMessage = 'APP_MESSAGE',
  PhoneCall = 'PHONE_CALL',
  InPerson = 'IN_PERSON',
  Email = 'EMAIL',
  VideoCall = 'VIDEO_CALL',
  SmsText = 'SMS_TEXT',
}

/** Every valid communication type, used to validate incoming values at the boundary. */
export const ALL_FAMILY_COMMUNICATION_TYPES: readonly FamilyCommunicationType[] =
  Object.values(FamilyCommunicationType);
