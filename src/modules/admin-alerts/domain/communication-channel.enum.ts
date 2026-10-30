/** How a documented incident communication was made. */
export enum CommunicationChannel {
  PhoneCall = 'PHONE_CALL',
  InternalMessage = 'INTERNAL_MESSAGE',
  Email = 'EMAIL',
  Sms = 'SMS',
}

/** The human label for a communication channel, e.g. "Phone Call". */
export const COMMUNICATION_CHANNEL_LABELS: Record<CommunicationChannel, string> = {
  [CommunicationChannel.PhoneCall]: 'Phone Call',
  [CommunicationChannel.InternalMessage]: 'Internal Message',
  [CommunicationChannel.Email]: 'Email',
  [CommunicationChannel.Sms]: 'SMS',
};
