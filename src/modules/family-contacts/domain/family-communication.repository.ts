import { FamilyCommunication } from './family-communication.entity';

/**
 * Persistence port for family communications (append only write side). The log reads
 * and the last contact per family member are served by the admin read model.
 */
export interface FamilyCommunicationRepository {
  add(communication: FamilyCommunication): Promise<void>;
}

export const FAMILY_COMMUNICATION_REPOSITORY = Symbol('FAMILY_COMMUNICATION_REPOSITORY');
