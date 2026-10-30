import { InboxCounts } from '../ports/messaging-read.port';

export interface InboxConversationResult {
  id: string;
  kind: string;
  /** The display name for the row: counterparty name for DIRECT, else the title. */
  name: string;
  roleLabel: string | null;
  preview: string | null;
  timeLabel: string | null;
  unreadCount: number;
}

export interface InboxResult {
  counts: InboxCounts;
  conversations: InboxConversationResult[];
}
