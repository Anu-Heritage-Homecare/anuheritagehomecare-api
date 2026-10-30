import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import {
  CONVERSATION_REPOSITORY,
  ConversationRepository,
} from '../../domain/conversation.repository';

/** Use case: mark a conversation read for the owning admin. */
@Injectable()
export class MarkConversationReadUseCase {
  constructor(
    @Inject(CONVERSATION_REPOSITORY) private readonly conversations: ConversationRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(adminId: string, conversationId: string): Promise<void> {
    const conversation = await this.conversations.findById(conversationId);
    if (conversation === null || conversation.adminId !== adminId) {
      throw new NotFoundDomainException('Conversation not found');
    }
    conversation.markReadByAdmin(this.clock.now());
    await this.conversations.save(conversation);
  }
}
