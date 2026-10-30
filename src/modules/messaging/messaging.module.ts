import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { MESSAGING_READ_MODEL } from './application/ports/messaging-read.port';
import { CreateAttachmentUploadTicketUseCase } from './application/use-cases/create-attachment-upload-ticket.use-case';
import { DeleteAttachmentUseCase } from './application/use-cases/delete-attachment.use-case';
import { GetAttachmentPreviewUseCase } from './application/use-cases/get-attachment-preview.use-case';
import { GetInboxUseCase } from './application/use-cases/get-inbox.use-case';
import { GetThreadUseCase } from './application/use-cases/get-thread.use-case';
import { MarkConversationReadUseCase } from './application/use-cases/mark-conversation-read.use-case';
import { SendMessageUseCase } from './application/use-cases/send-message.use-case';
import { StartConversationUseCase } from './application/use-cases/start-conversation.use-case';
import { ATTACHMENT_REPOSITORY } from './domain/attachment.repository';
import { CONVERSATION_REPOSITORY } from './domain/conversation.repository';
import { MESSAGE_REPOSITORY } from './domain/message.repository';
import { AttachmentPrismaRepository } from './infrastructure/persistence/attachment-prisma.repository';
import { ConversationPrismaRepository } from './infrastructure/persistence/conversation-prisma.repository';
import { MessagePrismaRepository } from './infrastructure/persistence/message-prisma.repository';
import { MessagingReadPrisma } from './infrastructure/persistence/messaging-read.prisma';
import { AdminMessagingController } from './presentation/admin-messaging.controller';

/** Messaging bounded context composition root (back office inbox, threads, send). */
@Module({
  imports: [PassportModule],
  controllers: [AdminMessagingController],
  providers: [
    GetInboxUseCase,
    GetThreadUseCase,
    StartConversationUseCase,
    SendMessageUseCase,
    MarkConversationReadUseCase,
    CreateAttachmentUploadTicketUseCase,
    GetAttachmentPreviewUseCase,
    DeleteAttachmentUseCase,
    { provide: CONVERSATION_REPOSITORY, useClass: ConversationPrismaRepository },
    { provide: MESSAGE_REPOSITORY, useClass: MessagePrismaRepository },
    { provide: ATTACHMENT_REPOSITORY, useClass: AttachmentPrismaRepository },
    { provide: MESSAGING_READ_MODEL, useClass: MessagingReadPrisma },
  ],
})
export class MessagingModule {}
