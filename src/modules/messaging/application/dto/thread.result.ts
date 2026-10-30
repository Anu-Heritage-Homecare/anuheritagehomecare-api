export interface ThreadAttachmentResult {
  id: string;
  fileName: string;
  sizeLabel: string;
  /** Delivery URL for the stored file, or empty when the store is not configured. */
  url: string;
}

export interface ThreadMessageResult {
  id: string;
  senderType: string;
  senderName: string | null;
  body: string;
  attachments: ThreadAttachmentResult[];
  at: string;
  timeLabel: string;
  /** True when the message was sent by the admin viewing the thread. */
  mine: boolean;
}

export interface ThreadLinkedRecipientResult {
  id: string;
  name: string;
  medicationSummary: string | null;
}

export interface ThreadParticipantResult {
  name: string;
  roleLabel: string | null;
  statusLabel: string | null;
  /** True for the admin viewing the thread (rendered as "You"). */
  isYou: boolean;
}

export interface ThreadLinkedVisitResult {
  id: string;
  reference: string;
  typeLabel: string | null;
  timeWindowLabel: string | null;
  date: string | null;
}

export interface ThreadResult {
  id: string;
  kind: string;
  name: string;
  roleLabel: string | null;
  participants: ThreadParticipantResult[];
  linkedRecipient: ThreadLinkedRecipientResult | null;
  linkedVisit: ThreadLinkedVisitResult | null;
  sharedFiles: ThreadAttachmentResult[];
  messages: ThreadMessageResult[];
}
