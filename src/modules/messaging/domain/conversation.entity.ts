import { AggregateRoot } from '@shared/domain/aggregate-root.base';
import { ConversationKind } from './conversation-kind.enum';
import { ConversationPriority } from './conversation-priority.enum';

interface ConversationProps {
  kind: ConversationKind;
  title: string | null;
  priority: ConversationPriority;
  adminId: string;
  counterpartyUserId: string | null;
  linkedCareRecipientId: string | null;
  linkedVisitId: string | null;
  adminLastReadAt: Date | null;
  lastMessageAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * A conversation in a back office inbox. It belongs to one owning admin and, for a
 * DIRECT thread, has one mobile user counterparty. VISIT/TEAM/ANNOUNCEMENT threads
 * carry a title instead. Read state for the unread count is tracked per owning
 * admin via adminLastReadAt.
 */
export class Conversation extends AggregateRoot<string> {
  private props: ConversationProps;

  private constructor(id: string, props: ConversationProps) {
    super(id);
    this.props = props;
  }

  /** Start a direct conversation between an admin and a mobile user. */
  public static createDirect(params: {
    id: string;
    adminId: string;
    counterpartyUserId: string;
    title?: string | null;
    priority?: ConversationPriority;
    linkedCareRecipientId?: string | null;
    linkedVisitId?: string | null;
    now: Date;
  }): Conversation {
    return new Conversation(params.id, {
      kind: ConversationKind.Direct,
      title: params.title ?? null,
      priority: params.priority ?? ConversationPriority.Normal,
      adminId: params.adminId,
      counterpartyUserId: params.counterpartyUserId,
      linkedCareRecipientId: params.linkedCareRecipientId ?? null,
      linkedVisitId: params.linkedVisitId ?? null,
      adminLastReadAt: null,
      lastMessageAt: null,
      createdAt: params.now,
      updatedAt: params.now,
    });
  }

  public static rehydrate(id: string, props: ConversationProps): Conversation {
    return new Conversation(id, props);
  }

  /** The owning admin has read the thread up to now. */
  public markReadByAdmin(now: Date): void {
    this.props.adminLastReadAt = now;
    this.props.updatedAt = now;
  }

  /** A new message landed; move the thread to the top of the inbox. */
  public touchLastMessage(now: Date): void {
    this.props.lastMessageAt = now;
    this.props.updatedAt = now;
  }

  public get kind(): ConversationKind {
    return this.props.kind;
  }

  public get title(): string | null {
    return this.props.title;
  }

  public get priority(): ConversationPriority {
    return this.props.priority;
  }

  public get adminId(): string {
    return this.props.adminId;
  }

  public get counterpartyUserId(): string | null {
    return this.props.counterpartyUserId;
  }

  public get linkedCareRecipientId(): string | null {
    return this.props.linkedCareRecipientId;
  }

  public get linkedVisitId(): string | null {
    return this.props.linkedVisitId;
  }

  public get adminLastReadAt(): Date | null {
    return this.props.adminLastReadAt;
  }

  public get lastMessageAt(): Date | null {
    return this.props.lastMessageAt;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }

  public get updatedAt(): Date {
    return this.props.updatedAt;
  }
}
