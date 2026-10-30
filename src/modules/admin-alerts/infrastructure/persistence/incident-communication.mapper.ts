import {
  CommunicationChannel as PrismaChannel,
  CommunicationOutcome as PrismaOutcome,
  IncidentCommunication as PrismaCommunication,
} from '@prisma/client';
import { CommunicationChannel } from '../../domain/communication-channel.enum';
import { CommunicationOutcome } from '../../domain/communication-outcome.enum';
import { IncidentCommunication } from '../../domain/incident-communication.entity';

const TO_DOMAIN_CHANNEL: Record<PrismaChannel, CommunicationChannel> = {
  PHONE_CALL: CommunicationChannel.PhoneCall,
  INTERNAL_MESSAGE: CommunicationChannel.InternalMessage,
  EMAIL: CommunicationChannel.Email,
  SMS: CommunicationChannel.Sms,
};

const TO_PERSISTENCE_CHANNEL: Record<CommunicationChannel, PrismaChannel> = {
  [CommunicationChannel.PhoneCall]: 'PHONE_CALL',
  [CommunicationChannel.InternalMessage]: 'INTERNAL_MESSAGE',
  [CommunicationChannel.Email]: 'EMAIL',
  [CommunicationChannel.Sms]: 'SMS',
};

const TO_DOMAIN_OUTCOME: Record<PrismaOutcome, CommunicationOutcome> = {
  REACHED: CommunicationOutcome.Reached,
  NO_ANSWER: CommunicationOutcome.NoAnswer,
  LEFT_MESSAGE: CommunicationOutcome.LeftMessage,
  ACKNOWLEDGED: CommunicationOutcome.Acknowledged,
};

const TO_PERSISTENCE_OUTCOME: Record<CommunicationOutcome, PrismaOutcome> = {
  [CommunicationOutcome.Reached]: 'REACHED',
  [CommunicationOutcome.NoAnswer]: 'NO_ANSWER',
  [CommunicationOutcome.LeftMessage]: 'LEFT_MESSAGE',
  [CommunicationOutcome.Acknowledged]: 'ACKNOWLEDGED',
};

/** Translates the incident communication row to and from the domain. */
export class IncidentCommunicationMapper {
  static toDomain(row: PrismaCommunication): IncidentCommunication {
    return IncidentCommunication.rehydrate(row.id, {
      incidentId: row.incidentId,
      at: row.at,
      channel: TO_DOMAIN_CHANNEL[row.channel],
      outcome: TO_DOMAIN_OUTCOME[row.outcome],
      contactName: row.contactName,
      contactRole: row.contactRole,
      notes: row.notes,
      authorAdminId: row.authorAdminId,
    });
  }

  static channelToPersistence(channel: CommunicationChannel): PrismaChannel {
    return TO_PERSISTENCE_CHANNEL[channel];
  }

  static outcomeToPersistence(outcome: CommunicationOutcome): PrismaOutcome {
    return TO_PERSISTENCE_OUTCOME[outcome];
  }
}
