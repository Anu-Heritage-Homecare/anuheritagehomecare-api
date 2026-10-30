import { Conversation } from './conversation.entity';

/** Persistence port for conversations. */
export interface ConversationRepository {
  save(conversation: Conversation): Promise<void>;
  findById(id: string): Promise<Conversation | null>;
  /** The existing direct thread between an admin and a mobile user, if any. */
  findDirect(adminId: string, counterpartyUserId: string): Promise<Conversation | null>;
}

export const CONVERSATION_REPOSITORY = Symbol('CONVERSATION_REPOSITORY');
