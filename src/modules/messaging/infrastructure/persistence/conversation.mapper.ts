import { Conversation as PrismaConversation } from '@prisma/client';
import { ConversationKind } from '../../domain/conversation-kind.enum';
import { ConversationPriority } from '../../domain/conversation-priority.enum';
import { Conversation } from '../../domain/conversation.entity';

/** Translates between the Prisma conversation row and the aggregate. */
export class ConversationMapper {
  static toDomain(row: PrismaConversation): Conversation {
    return Conversation.rehydrate(row.id, {
      kind: row.kind as ConversationKind,
      title: row.title,
      priority: row.priority as ConversationPriority,
      adminId: row.adminId,
      counterpartyUserId: row.counterpartyUserId,
      linkedCareRecipientId: row.linkedCareRecipientId,
      linkedVisitId: row.linkedVisitId,
      adminLastReadAt: row.adminLastReadAt,
      lastMessageAt: row.lastMessageAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  static toPersistence(conversation: Conversation): PrismaConversation {
    return {
      id: conversation.id,
      kind: conversation.kind,
      title: conversation.title,
      priority: conversation.priority,
      adminId: conversation.adminId,
      counterpartyUserId: conversation.counterpartyUserId,
      linkedCareRecipientId: conversation.linkedCareRecipientId,
      linkedVisitId: conversation.linkedVisitId,
      adminLastReadAt: conversation.adminLastReadAt,
      lastMessageAt: conversation.lastMessageAt,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
    };
  }
}
