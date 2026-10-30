import { Entity } from '@shared/domain/entity.base';
import { ValidationException } from '@shared/domain/domain-exception';
import { MessageSenderType } from './message-sender-type.enum';

const MAX_BODY_LENGTH = 4000;
const MAX_ATTACHMENTS = 10;
const MAX_FILE_NAME = 255;

/** One file attached to a message, with the metadata the File Preview panel needs. */
export interface MessageAttachmentData {
  id: string;
  storageKey: string;
  fileName: string;
  sizeBytes: number;
}

interface MessageProps {
  conversationId: string;
  senderType: MessageSenderType;
  senderAdminId: string | null;
  senderUserId: string | null;
  body: string;
  attachments: MessageAttachmentData[];
  createdAt: Date;
}

/** A single message in a conversation. Append only. */
export class Message extends Entity<string> {
  private props: MessageProps;

  private constructor(id: string, props: MessageProps) {
    super(id);
    this.props = props;
  }

  /** A message sent by a back office admin. */
  public static fromAdmin(params: {
    id: string;
    conversationId: string;
    senderAdminId: string;
    body: string;
    attachments?: MessageAttachmentData[];
    now: Date;
  }): Message {
    return new Message(params.id, {
      conversationId: params.conversationId,
      senderType: MessageSenderType.Admin,
      senderAdminId: params.senderAdminId,
      senderUserId: null,
      body: Message.cleanBody(params.body),
      attachments: Message.cleanAttachments(params.attachments),
      createdAt: params.now,
    });
  }

  private static cleanBody(value: string): string {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      throw new ValidationException('Message body is required');
    }
    if (trimmed.length > MAX_BODY_LENGTH) {
      throw new ValidationException('Message body exceeds the maximum length');
    }
    return trimmed;
  }

  private static cleanAttachments(
    attachments: MessageAttachmentData[] | undefined,
  ): MessageAttachmentData[] {
    if (attachments === undefined || attachments.length === 0) {
      return [];
    }
    if (attachments.length > MAX_ATTACHMENTS) {
      throw new ValidationException(
        `A message cannot have more than ${MAX_ATTACHMENTS} attachments`,
      );
    }
    return attachments.map((a) => {
      const storageKey = a.storageKey.trim();
      const fileName = a.fileName.trim();
      if (storageKey.length === 0) {
        throw new ValidationException('An attachment storage key is required');
      }
      if (fileName.length === 0 || fileName.length > MAX_FILE_NAME) {
        throw new ValidationException('An attachment file name is required');
      }
      if (!Number.isInteger(a.sizeBytes) || a.sizeBytes < 0) {
        throw new ValidationException('An attachment size must be a non negative integer');
      }
      return { id: a.id, storageKey, fileName, sizeBytes: a.sizeBytes };
    });
  }

  public get conversationId(): string {
    return this.props.conversationId;
  }

  public get senderType(): MessageSenderType {
    return this.props.senderType;
  }

  public get senderAdminId(): string | null {
    return this.props.senderAdminId;
  }

  public get senderUserId(): string | null {
    return this.props.senderUserId;
  }

  public get body(): string {
    return this.props.body;
  }

  public get attachments(): MessageAttachmentData[] {
    return [...this.props.attachments];
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }
}
