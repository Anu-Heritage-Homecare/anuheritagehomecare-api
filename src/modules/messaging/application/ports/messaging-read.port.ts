export type InboxFolder =
  'ALL' | 'UNREAD' | 'DIRECT' | 'CAREGIVERS' | 'FAMILIES' | 'VISITS' | 'ANNOUNCEMENTS';

export interface InboxCounts {
  all: number;
  unread: number;
  direct: number;
  caregivers: number;
  families: number;
  visits: number;
  announcements: number;
}

export interface InboxRow {
  id: string;
  kind: string;
  title: string | null;
  counterpartyName: string | null;
  counterpartyRole: string | null;
  lastMessageBody: string | null;
  lastMessageAt: Date | null;
  unreadCount: number;
}

export interface InboxRead {
  counts: InboxCounts;
  rows: InboxRow[];
}

export interface AttachmentRow {
  id: string;
  storageKey: string;
  fileName: string;
  sizeBytes: number;
}

export interface ThreadMessageRow {
  id: string;
  senderType: string;
  senderAdminId: string | null;
  senderUserId: string | null;
  senderName: string | null;
  body: string;
  attachments: AttachmentRow[];
  createdAt: Date;
}

export interface AttachmentPreviewRow {
  id: string;
  storageKey: string;
  fileName: string;
  sizeBytes: number;
  createdAt: Date;
  uploaderName: string | null;
  uploaderRole: string | null;
  linkedVisitId: string | null;
  linkedVisitReference: string | null;
}

export interface ThreadRead {
  id: string;
  kind: string;
  title: string | null;
  adminId: string;
  counterpartyName: string | null;
  counterpartyRole: string | null;
  counterpartyStatus: string | null;
  /** The owning admin, shown as the "You" participant in the details panel. */
  adminName: string | null;
  adminRole: string | null;
  linkedRecipientId: string | null;
  linkedRecipientName: string | null;
  linkedMedicationSummary: string | null;
  linkedVisitId: string | null;
  linkedVisitReference: string | null;
  linkedVisitType: string | null;
  linkedVisitStartMinute: number | null;
  linkedVisitEndMinute: number | null;
  linkedVisitDate: Date | null;
  /** Files shared across the thread, newest first (the Shared Files panel). */
  sharedFiles: AttachmentRow[];
  messages: ThreadMessageRow[];
}

/**
 * Read model for the messaging screens. Resolves counterparty names and roles,
 * previews, unread counts, folder counts and the linked record, querying the other
 * contexts' tables directly (the established read model pattern).
 */
export interface MessagingReadModel {
  getInbox(adminId: string, folder: InboxFolder, search: string | null): Promise<InboxRead>;
  /** The thread, or null if it does not exist or is not in this admin's inbox. */
  getThread(adminId: string, conversationId: string): Promise<ThreadRead | null>;
  /** A single attachment for the File Preview, or null if not in this admin's inbox. */
  getAttachment(adminId: string, attachmentId: string): Promise<AttachmentPreviewRow | null>;
}

export const MESSAGING_READ_MODEL = Symbol('MESSAGING_READ_MODEL');
