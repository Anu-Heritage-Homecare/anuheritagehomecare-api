import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { InboxResult } from '../dto/inbox.result';
import {
  InboxFolder,
  MESSAGING_READ_MODEL,
  MessagingReadModel,
} from '../ports/messaging-read.port';
import { conversationRoleLabel, previewLabel, timeAgoLabel } from '../messaging.presenter';

export interface GetInboxQuery {
  adminId: string;
  folder: InboxFolder;
  search: string | null;
}

/** Use case: the messaging inbox (folder counts and the filtered conversation list). */
@Injectable()
export class GetInboxUseCase {
  constructor(
    @Inject(MESSAGING_READ_MODEL) private readonly reads: MessagingReadModel,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(query: GetInboxQuery): Promise<InboxResult> {
    const inbox = await this.reads.getInbox(query.adminId, query.folder, query.search);
    const now = this.clock.now();

    return {
      counts: inbox.counts,
      conversations: inbox.rows.map((row) => ({
        id: row.id,
        kind: row.kind,
        name: row.title ?? row.counterpartyName ?? 'Conversation',
        roleLabel: conversationRoleLabel(row.kind, row.counterpartyRole),
        preview: previewLabel(row.lastMessageBody),
        timeLabel: row.lastMessageAt === null ? null : timeAgoLabel(row.lastMessageAt, now),
        unreadCount: row.unreadCount,
      })),
    };
  }
}
