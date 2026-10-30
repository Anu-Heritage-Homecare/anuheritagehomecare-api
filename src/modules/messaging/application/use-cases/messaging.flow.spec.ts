import { Clock } from '@shared/application/ports/clock.port';
import { IdGenerator } from '@shared/application/ports/id-generator.port';
import { PhotoStorage } from '@shared/application/ports/photo-storage.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { AttachmentRepository } from '../../domain/attachment.repository';
import { ConversationPriority } from '../../domain/conversation-priority.enum';
import { Conversation } from '../../domain/conversation.entity';
import { ConversationRepository } from '../../domain/conversation.repository';
import { Message } from '../../domain/message.entity';
import { MessageRepository } from '../../domain/message.repository';
import {
  AttachmentPreviewRow,
  InboxRead,
  MessagingReadModel,
  ThreadRead,
} from '../ports/messaging-read.port';
import {
  conversationRoleLabel,
  dateTimeLabel,
  fileSizeLabel,
  humanLabel,
  minuteClockLabel,
  previewLabel,
  timeAgoLabel,
} from '../messaging.presenter';
import { DeleteAttachmentUseCase } from './delete-attachment.use-case';
import { GetAttachmentPreviewUseCase } from './get-attachment-preview.use-case';
import { GetInboxUseCase } from './get-inbox.use-case';
import { GetThreadUseCase } from './get-thread.use-case';
import { MarkConversationReadUseCase } from './mark-conversation-read.use-case';
import { SendMessageUseCase } from './send-message.use-case';
import { StartConversationUseCase } from './start-conversation.use-case';

const NOW = new Date('2026-10-30T10:20:00.000Z');
const clock: Clock = { now: () => NOW };

const photoStorage: PhotoStorage = {
  createUploadTicket: () => ({
    uploadUrl: 'https://store/upload',
    fields: {},
    key: 'generated-key',
  }),
  urlFor: (key) => (key.length === 0 ? '' : `https://cdn.test/${key}`),
  download: () => Promise.resolve(Buffer.from('')),
};

function sequentialIds(): IdGenerator {
  let n = 0;
  return {
    generate: () => {
      n += 1;
      return `id-${n}`;
    },
  };
}

function convRepo(seed: Conversation[]): ConversationRepository & { saved: Conversation[] } {
  const store = new Map(seed.map((c) => [c.id, c]));
  const saved: Conversation[] = [];
  return {
    saved,
    save: (c) => {
      saved.push(c);
      store.set(c.id, c);
      return Promise.resolve();
    },
    findById: (id) => Promise.resolve(store.get(id) ?? null),
    findDirect: (adminId, userId) =>
      Promise.resolve(
        [...store.values()].find((c) => c.adminId === adminId && c.counterpartyUserId === userId) ??
          null,
      ),
  };
}

function msgRepo(): MessageRepository & { saved: Message[] } {
  const saved: Message[] = [];
  return {
    saved,
    save: (m) => {
      saved.push(m);
      return Promise.resolve();
    },
  };
}

describe('presenter', () => {
  it('formats relative time and role badges', () => {
    expect(timeAgoLabel(new Date('2026-10-30T10:18:00.000Z'), NOW)).toBe('2m ago');
    expect(timeAgoLabel(new Date('2026-10-30T08:20:00.000Z'), NOW)).toBe('2h ago');
    expect(timeAgoLabel(new Date('2026-10-29T09:00:00.000Z'), NOW)).toBe('Yesterday');
    expect(conversationRoleLabel('DIRECT', 'CAREGIVER')).toBe('Caregiver');
    expect(conversationRoleLabel('DIRECT', 'FAMILY_MEMBER')).toBe('Family');
    expect(conversationRoleLabel('VISIT', null)).toBe('Visit');
    expect(previewLabel('  hello   world  ')).toBe('hello world');
    expect(humanLabel('MORNING_CARE')).toBe('Morning Care');
    expect(humanLabel('OPERATIONS_MANAGER')).toBe('Operations Manager');
    expect(minuteClockLabel(480)).toBe('8:00 AM');
    expect(minuteClockLabel(720)).toBe('12:00 PM');
    expect(fileSizeLabel(421888)).toBe('412 KB');
    expect(fileSizeLabel(1258291)).toBe('1.2 MB');
    expect(dateTimeLabel(new Date('2026-07-18T14:39:00.000Z'))).toBe('Jul 18, 2026, 2:39 PM');
  });
});

describe('GetInboxUseCase', () => {
  it('maps rows with name, role, preview and relative time', async () => {
    const inbox: InboxRead = {
      counts: {
        all: 1,
        unread: 1,
        direct: 1,
        caregivers: 1,
        families: 0,
        visits: 0,
        announcements: 0,
      },
      rows: [
        {
          id: 'c1',
          kind: 'DIRECT',
          title: null,
          counterpartyName: 'Amina Bello',
          counterpartyRole: 'CAREGIVER',
          lastMessageBody: 'Mrs. Adeyemi medication schedule has been updated',
          lastMessageAt: new Date('2026-10-30T10:18:00.000Z'),
          unreadCount: 2,
        },
      ],
    };
    const reads: MessagingReadModel = {
      getInbox: () => Promise.resolve(inbox),
      getThread: () => Promise.resolve(null),
      getAttachment: () => Promise.resolve(null),
    };
    const result = await new GetInboxUseCase(reads, clock).execute({
      adminId: 'admin-1',
      folder: 'ALL',
      search: null,
    });
    expect(result.counts.all).toBe(1);
    expect(result.conversations[0]).toMatchObject({
      name: 'Amina Bello',
      roleLabel: 'Caregiver',
      timeLabel: '2m ago',
      unreadCount: 2,
    });
  });
});

describe('GetThreadUseCase', () => {
  const base: ThreadRead = {
    id: 'c1',
    kind: 'DIRECT',
    title: null,
    adminId: 'admin-1',
    counterpartyName: 'Amina Bello',
    counterpartyRole: 'CAREGIVER',
    counterpartyStatus: 'ACTIVE',
    adminName: 'Sarah Jenkins',
    adminRole: 'COORDINATOR',
    linkedRecipientId: 'r1',
    linkedRecipientName: 'Mrs. Adeyemi',
    linkedMedicationSummary: 'Metformin 500mg, Lisinopril 10mg',
    linkedVisitId: 'v1',
    linkedVisitReference: 'VIS-2026-0872',
    linkedVisitType: 'MORNING_CARE',
    linkedVisitStartMinute: 480,
    linkedVisitEndMinute: 720,
    linkedVisitDate: new Date('2026-10-30T00:00:00.000Z'),
    sharedFiles: [
      {
        id: 'att-1',
        storageKey: 'files/bp.pdf',
        fileName: 'BP_Reading_Jul18.pdf',
        sizeBytes: 421888,
      },
    ],
    messages: [
      {
        id: 'm1',
        senderType: 'USER',
        senderAdminId: null,
        senderUserId: 'u1',
        senderName: 'Amina Bello',
        body: 'Hi Sarah',
        attachments: [
          {
            id: 'att-1',
            storageKey: 'files/bp.pdf',
            fileName: 'BP_Reading_Jul18.pdf',
            sizeBytes: 421888,
          },
        ],
        createdAt: new Date('2026-10-30T10:15:00.000Z'),
      },
      {
        id: 'm2',
        senderType: 'ADMIN',
        senderAdminId: 'admin-1',
        senderUserId: null,
        senderName: 'Sarah Jenkins',
        body: 'Thanks Amina',
        attachments: [],
        createdAt: new Date('2026-10-30T10:18:00.000Z'),
      },
    ],
  };

  it('marks the admin own messages as mine and surfaces the linked record', async () => {
    const reads: MessagingReadModel = {
      getInbox: () => Promise.resolve({} as InboxRead),
      getThread: () => Promise.resolve(base),
      getAttachment: () => Promise.resolve(null),
    };
    const result = await new GetThreadUseCase(reads, photoStorage).execute('admin-1', 'c1');
    expect(result.linkedRecipient).toEqual({
      id: 'r1',
      name: 'Mrs. Adeyemi',
      medicationSummary: 'Metformin 500mg, Lisinopril 10mg',
    });
    expect(result.participants).toEqual([
      { name: 'Amina Bello', roleLabel: 'Caregiver', statusLabel: 'Active', isYou: false },
      { name: 'Sarah Jenkins', roleLabel: 'Coordinator', statusLabel: null, isYou: true },
    ]);
    expect(result.linkedVisit).toEqual({
      id: 'v1',
      reference: 'VIS-2026-0872',
      typeLabel: 'Morning Care',
      timeWindowLabel: '8:00 AM to 12:00 PM',
      date: '2026-10-30T00:00:00.000Z',
    });
    expect(result.sharedFiles).toEqual([
      {
        id: 'att-1',
        fileName: 'BP_Reading_Jul18.pdf',
        sizeLabel: '412 KB',
        url: 'https://cdn.test/files/bp.pdf',
      },
    ]);
    expect(result.messages[0].attachments[0]).toMatchObject({
      fileName: 'BP_Reading_Jul18.pdf',
      sizeLabel: '412 KB',
      url: 'https://cdn.test/files/bp.pdf',
    });
    expect(result.messages.map((m) => m.mine)).toEqual([false, true]);
    expect(result.messages[0].timeLabel).toBe('10:15 AM');
  });

  it('throws when the thread is not in the admin inbox', async () => {
    const reads: MessagingReadModel = {
      getInbox: () => Promise.resolve({} as InboxRead),
      getThread: () => Promise.resolve(null),
      getAttachment: () => Promise.resolve(null),
    };
    await expect(
      new GetThreadUseCase(reads, photoStorage).execute('admin-1', 'nope'),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});

describe('GetAttachmentPreviewUseCase and DeleteAttachmentUseCase', () => {
  const attachment: AttachmentPreviewRow = {
    id: 'att-1',
    storageKey: 'files/bp.pdf',
    fileName: 'BP_Reading_Jul18.pdf',
    sizeBytes: 421888,
    createdAt: new Date('2026-07-18T14:39:00.000Z'),
    uploaderName: 'Amina Bello',
    uploaderRole: 'CAREGIVER',
    linkedVisitId: 'v1',
    linkedVisitReference: 'VIS-2026-0872',
  };

  function reads(row: AttachmentPreviewRow | null): MessagingReadModel {
    return {
      getInbox: () => Promise.resolve({} as InboxRead),
      getThread: () => Promise.resolve(null),
      getAttachment: () => Promise.resolve(row),
    };
  }

  it('builds the File Preview panel', async () => {
    const result = await new GetAttachmentPreviewUseCase(reads(attachment), photoStorage).execute(
      'admin-1',
      'att-1',
    );
    expect(result).toEqual({
      id: 'att-1',
      fileName: 'BP_Reading_Jul18.pdf',
      sizeLabel: '412 KB',
      uploadedByLabel: 'Amina Bello (Caregiver)',
      uploadDateLabel: 'Jul 18, 2026, 2:39 PM',
      linkedVisitId: 'v1',
      linkedVisitReference: 'VIS-2026-0872',
      url: 'https://cdn.test/files/bp.pdf',
    });
  });

  it('throws when the attachment is not in the admin inbox', async () => {
    await expect(
      new GetAttachmentPreviewUseCase(reads(null), photoStorage).execute('admin-1', 'nope'),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });

  it('deletes an owned attachment and rejects an unowned one', async () => {
    const deleted: string[] = [];
    const attachments: AttachmentRepository = {
      deleteById: (id) => {
        deleted.push(id);
        return Promise.resolve();
      },
    };
    await new DeleteAttachmentUseCase(reads(attachment), attachments).execute('admin-1', 'att-1');
    expect(deleted).toEqual(['att-1']);

    await expect(
      new DeleteAttachmentUseCase(reads(null), attachments).execute('admin-1', 'att-1'),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});

describe('StartConversationUseCase', () => {
  it('reuses an existing direct thread instead of creating a duplicate', async () => {
    const existing = Conversation.createDirect({
      id: 'c-existing',
      adminId: 'admin-1',
      counterpartyUserId: 'u1',
      now: NOW,
    });
    const conversations = convRepo([existing]);
    const messages = msgRepo();
    const result = await new StartConversationUseCase(
      conversations,
      messages,
      sequentialIds(),
      clock,
    ).execute({ adminId: 'admin-1', counterpartyUserIds: ['u1'], body: 'Hello' });

    expect(result.conversationIds).toEqual(['c-existing']);
    expect(messages.saved).toHaveLength(1);
    expect(conversations.saved[0].lastMessageAt).toEqual(NOW);
    expect(conversations.saved[0].adminLastReadAt).toEqual(NOW);
  });

  it('creates a new thread when none exists, applying the subject and priority', async () => {
    const conversations = convRepo([]);
    const messages = msgRepo();
    const result = await new StartConversationUseCase(
      conversations,
      messages,
      sequentialIds(),
      clock,
    ).execute({
      adminId: 'admin-1',
      counterpartyUserIds: ['u2'],
      subject: 'Medication update',
      priority: ConversationPriority.High,
      body: 'Hello',
    });

    expect(result.conversationIds).toEqual(['id-1']);
    expect(messages.saved[0].body).toBe('Hello');
    expect(conversations.saved[0].title).toBe('Medication update');
    expect(conversations.saved[0].priority).toBe(ConversationPriority.High);
  });

  it('fans out to one direct thread per recipient', async () => {
    const conversations = convRepo([]);
    const messages = msgRepo();
    const result = await new StartConversationUseCase(
      conversations,
      messages,
      sequentialIds(),
      clock,
    ).execute({ adminId: 'admin-1', counterpartyUserIds: ['u1', 'u2'], body: 'Team notice' });

    expect(result.conversationIds).toHaveLength(2);
    expect(new Set(result.conversationIds).size).toBe(2);
    expect(messages.saved).toHaveLength(2);
  });
});

describe('SendMessageUseCase', () => {
  it('appends a message to an owned conversation', async () => {
    const conv = Conversation.createDirect({
      id: 'c1',
      adminId: 'admin-1',
      counterpartyUserId: 'u1',
      now: NOW,
    });
    const conversations = convRepo([conv]);
    const messages = msgRepo();
    const result = await new SendMessageUseCase(
      conversations,
      messages,
      sequentialIds(),
      clock,
    ).execute({ adminId: 'admin-1', conversationId: 'c1', body: 'Did she take her meds?' });
    expect(result.messageId).toBe('id-1');
    expect(messages.saved).toHaveLength(1);
  });

  it('rejects sending to another admin conversation', async () => {
    const conv = Conversation.createDirect({
      id: 'c1',
      adminId: 'other-admin',
      counterpartyUserId: 'u1',
      now: NOW,
    });
    await expect(
      new SendMessageUseCase(convRepo([conv]), msgRepo(), sequentialIds(), clock).execute({
        adminId: 'admin-1',
        conversationId: 'c1',
        body: 'x',
      }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});

describe('MarkConversationReadUseCase', () => {
  it('stamps the admin read time', async () => {
    const conv = Conversation.createDirect({
      id: 'c1',
      adminId: 'admin-1',
      counterpartyUserId: 'u1',
      now: new Date('2026-10-29T00:00:00.000Z'),
    });
    const conversations = convRepo([conv]);
    await new MarkConversationReadUseCase(conversations, clock).execute('admin-1', 'c1');
    expect(conversations.saved[0].adminLastReadAt).toEqual(NOW);
  });

  it('rejects an unowned conversation', async () => {
    const conv = Conversation.createDirect({
      id: 'c1',
      adminId: 'other',
      counterpartyUserId: 'u1',
      now: NOW,
    });
    await expect(
      new MarkConversationReadUseCase(convRepo([conv]), clock).execute('admin-1', 'c1'),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});
