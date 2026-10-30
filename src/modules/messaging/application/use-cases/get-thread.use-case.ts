import { Inject, Injectable } from '@nestjs/common';
import { PHOTO_STORAGE, PhotoStorage } from '@shared/application/ports/photo-storage.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import {
  ThreadAttachmentResult,
  ThreadParticipantResult,
  ThreadResult,
} from '../dto/thread.result';
import {
  AttachmentRow,
  MESSAGING_READ_MODEL,
  MessagingReadModel,
  ThreadRead,
} from '../ports/messaging-read.port';
import {
  clockTimeLabel,
  conversationRoleLabel,
  fileSizeLabel,
  humanLabel,
  minuteClockLabel,
} from '../messaging.presenter';

/** Use case: load a conversation thread for the owning admin. */
@Injectable()
export class GetThreadUseCase {
  constructor(
    @Inject(MESSAGING_READ_MODEL) private readonly reads: MessagingReadModel,
    @Inject(PHOTO_STORAGE) private readonly photoStorage: PhotoStorage,
  ) {}

  async execute(adminId: string, conversationId: string): Promise<ThreadResult> {
    const thread = await this.reads.getThread(adminId, conversationId);
    if (thread === null) {
      throw new NotFoundDomainException('Conversation not found');
    }

    return {
      id: thread.id,
      kind: thread.kind,
      name: thread.title ?? thread.counterpartyName ?? 'Conversation',
      roleLabel: conversationRoleLabel(thread.kind, thread.counterpartyRole),
      participants: this.participants(thread),
      linkedRecipient:
        thread.linkedRecipientId === null || thread.linkedRecipientName === null
          ? null
          : {
              id: thread.linkedRecipientId,
              name: thread.linkedRecipientName,
              medicationSummary: thread.linkedMedicationSummary,
            },
      linkedVisit:
        thread.linkedVisitId === null || thread.linkedVisitReference === null
          ? null
          : {
              id: thread.linkedVisitId,
              reference: thread.linkedVisitReference,
              typeLabel: humanLabel(thread.linkedVisitType),
              timeWindowLabel:
                thread.linkedVisitStartMinute === null || thread.linkedVisitEndMinute === null
                  ? null
                  : `${minuteClockLabel(thread.linkedVisitStartMinute)} to ${minuteClockLabel(
                      thread.linkedVisitEndMinute,
                    )}`,
              date: thread.linkedVisitDate?.toISOString() ?? null,
            },
      sharedFiles: thread.sharedFiles.map((f) => this.toAttachment(f)),
      messages: thread.messages.map((m) => ({
        id: m.id,
        senderType: m.senderType,
        senderName: m.senderName,
        body: m.body,
        attachments: m.attachments.map((a) => this.toAttachment(a)),
        at: m.createdAt.toISOString(),
        timeLabel: clockTimeLabel(m.createdAt),
        mine: m.senderType === 'ADMIN' && m.senderAdminId === adminId,
      })),
    };
  }

  private toAttachment(row: AttachmentRow): ThreadAttachmentResult {
    return {
      id: row.id,
      fileName: row.fileName,
      sizeLabel: fileSizeLabel(row.sizeBytes),
      url: this.photoStorage.urlFor(row.storageKey),
    };
  }

  /** The details panel participants: the counterparty, then the viewing admin ("You"). */
  private participants(thread: ThreadRead): ThreadParticipantResult[] {
    const participants: ThreadParticipantResult[] = [];
    if (thread.counterpartyName !== null) {
      participants.push({
        name: thread.counterpartyName,
        roleLabel: conversationRoleLabel(thread.kind, thread.counterpartyRole),
        statusLabel: humanLabel(thread.counterpartyStatus),
        isYou: false,
      });
    }
    if (thread.adminName !== null) {
      participants.push({
        name: thread.adminName,
        roleLabel: humanLabel(thread.adminRole),
        statusLabel: null,
        isYou: true,
      });
    }
    return participants;
  }
}
