import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { Conversation } from '../../domain/conversation.entity';
import { ConversationRepository } from '../../domain/conversation.repository';
import { ConversationMapper } from './conversation.mapper';

/** Prisma adapter for the ConversationRepository port. */
@Injectable()
export class ConversationPrismaRepository implements ConversationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(conversation: Conversation): Promise<void> {
    const row = ConversationMapper.toPersistence(conversation);
    await this.prisma.conversation.upsert({
      where: { id: row.id },
      create: row,
      update: {
        title: row.title,
        linkedCareRecipientId: row.linkedCareRecipientId,
        linkedVisitId: row.linkedVisitId,
        adminLastReadAt: row.adminLastReadAt,
        lastMessageAt: row.lastMessageAt,
        updatedAt: row.updatedAt,
      },
    });
  }

  async findById(id: string): Promise<Conversation | null> {
    const row = await this.prisma.conversation.findUnique({ where: { id } });
    return row ? ConversationMapper.toDomain(row) : null;
  }

  async findDirect(adminId: string, counterpartyUserId: string): Promise<Conversation | null> {
    const row = await this.prisma.conversation.findFirst({
      where: { adminId, counterpartyUserId, kind: 'DIRECT' },
    });
    return row ? ConversationMapper.toDomain(row) : null;
  }
}
