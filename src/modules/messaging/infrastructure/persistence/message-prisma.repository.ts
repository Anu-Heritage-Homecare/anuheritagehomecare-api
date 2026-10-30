import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { Message } from '../../domain/message.entity';
import { MessageRepository } from '../../domain/message.repository';

/** Prisma adapter for the MessageRepository port (append only). */
@Injectable()
export class MessagePrismaRepository implements MessageRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(message: Message): Promise<void> {
    await this.prisma.message.create({
      data: {
        id: message.id,
        conversationId: message.conversationId,
        senderType: message.senderType,
        senderAdminId: message.senderAdminId,
        senderUserId: message.senderUserId,
        body: message.body,
        createdAt: message.createdAt,
        attachments: {
          create: message.attachments.map((a) => ({
            id: a.id,
            storageKey: a.storageKey,
            fileName: a.fileName,
            sizeBytes: a.sizeBytes,
            createdAt: message.createdAt,
          })),
        },
      },
    });
  }
}
