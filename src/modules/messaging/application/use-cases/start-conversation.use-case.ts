import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import { ConversationPriority } from '../../domain/conversation-priority.enum';
import { Conversation } from '../../domain/conversation.entity';
import {
  CONVERSATION_REPOSITORY,
  ConversationRepository,
} from '../../domain/conversation.repository';
import { Message } from '../../domain/message.entity';
import { MESSAGE_REPOSITORY, MessageRepository } from '../../domain/message.repository';
import { AttachmentInput } from './send-message.use-case';

export interface StartConversationCommand {
  adminId: string;
  counterpartyUserIds: string[];
  body: string;
  subject?: string | null;
  priority?: ConversationPriority;
  attachments?: AttachmentInput[];
  linkedCareRecipientId?: string | null;
  linkedVisitId?: string | null;
}

/**
 * Use case: start (or reuse) a direct conversation with each recipient and post the
 * first message to each. Multiple recipients fan out to one direct thread per
 * recipient (the model is 1:1; a shared TEAM thread with many participants is not
 * modeled yet). An existing direct thread is reused so New Message does not create
 * duplicates. The subject and priority apply only to newly created threads.
 *
 * shortcut: the counterparty user's existence is not verified here; New Message
 * sends ids picked from a server backed list. Add a user lookup if that changes.
 */
@Injectable()
export class StartConversationUseCase {
  constructor(
    @Inject(CONVERSATION_REPOSITORY) private readonly conversations: ConversationRepository,
    @Inject(MESSAGE_REPOSITORY) private readonly messages: MessageRepository,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: StartConversationCommand): Promise<{ conversationIds: string[] }> {
    const conversationIds: string[] = [];
    for (const counterpartyUserId of command.counterpartyUserIds) {
      conversationIds.push(await this.deliverTo(counterpartyUserId, command));
    }
    return { conversationIds };
  }

  private async deliverTo(
    counterpartyUserId: string,
    command: StartConversationCommand,
  ): Promise<string> {
    const now = this.clock.now();
    const existing = await this.conversations.findDirect(command.adminId, counterpartyUserId);
    const conversation =
      existing ??
      Conversation.createDirect({
        id: this.ids.generate(),
        adminId: command.adminId,
        counterpartyUserId,
        title: command.subject ?? null,
        priority: command.priority,
        linkedCareRecipientId: command.linkedCareRecipientId,
        linkedVisitId: command.linkedVisitId,
        now,
      });

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

    return conversation.id;
  }
}
