import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import {
  CONVERSATION_REPOSITORY,
  ConversationRepository,
} from '../../domain/conversation.repository';
import { Message } from '../../domain/message.entity';
import { MESSAGE_REPOSITORY, MessageRepository } from '../../domain/message.repository';

export interface AttachmentInput {
  storageKey: string;
  fileName: string;
  sizeBytes: number;
}

export interface SendMessageCommand {
  adminId: string;
  conversationId: string;
  body: string;
  attachments?: AttachmentInput[];
}

/** Use case: post a message to an existing conversation in the admin's inbox. */
@Injectable()
export class SendMessageUseCase {
  constructor(
    @Inject(CONVERSATION_REPOSITORY) private readonly conversations: ConversationRepository,
    @Inject(MESSAGE_REPOSITORY) private readonly messages: MessageRepository,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: SendMessageCommand): Promise<{ messageId: string }> {
    const conversation = await this.conversations.findById(command.conversationId);
    if (conversation === null || conversation.adminId !== command.adminId) {
      throw new NotFoundDomainException('Conversation not found');
    }

    const now = this.clock.now();
    const message = Message.fromAdmin({
      id: this.ids.generate(),
      conversationId: conversation.id,
      senderAdminId: command.adminId,
      body: command.body,
      attachments: (command.attachments ?? []).map((a) => ({ id: this.ids.generate(), ...a })),
      now,
    });
    await this.messages.save(message);

    conversation.touchLastMessage(now);
    conversation.markReadByAdmin(now);
    await this.conversations.save(conversation);

    return { messageId: message.id };
  }
}
