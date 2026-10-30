import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import {
  AttachmentPreviewRow,
  InboxFolder,
  InboxRead,
  InboxRow,
  MessagingReadModel,
  ThreadMessageRow,
  ThreadRead,
} from '../../application/ports/messaging-read.port';

interface CounterpartyInfo {
  name: string;
  role: string;
  status: string;
}

interface LinkedVisitInfo {
  reference: string;
  visitType: string;
  startMinute: number;
  endMinute: number;
  scheduledDate: Date;
}

/** Prisma read model for the messaging screens. */
@Injectable()
export class MessagingReadPrisma implements MessagingReadModel {
  constructor(private readonly prisma: PrismaService) {}

  async getInbox(adminId: string, folder: InboxFolder, search: string | null): Promise<InboxRead> {
    // shortcut: loads all of an admin's conversations for accurate folder counts.
    // Add pagination if an inbox grows large (homecare inboxes are bounded today).
    const conversations = await this.prisma.conversation.findMany({
      where: { adminId },
      orderBy: [{ lastMessageAt: { sort: 'desc', nulls: 'last' } }],
    });
    const ids = conversations.map((c) => c.id);

    const userIds = [
      ...new Set(
        conversations.map((c) => c.counterpartyUserId).filter((id): id is string => id !== null),
      ),
    ];

    const [counterparties, unread, previews] = await Promise.all([
      this.counterparties(userIds),
      this.unreadCounts(adminId),
      this.lastMessageBodies(ids),
    ]);

    const rows: InboxRow[] = conversations.map((c) => {
      const info =
        c.counterpartyUserId === null ? null : (counterparties.get(c.counterpartyUserId) ?? null);
      return {
        id: c.id,
        kind: String(c.kind),
        title: c.title,
        counterpartyName: info?.name ?? null,
        counterpartyRole: info?.role ?? null,
        lastMessageBody: previews.get(c.id) ?? null,
        lastMessageAt: c.lastMessageAt,
        unreadCount: unread.get(c.id) ?? 0,
      };
    });

    const counts = {
      all: rows.length,
      unread: rows.filter((r) => r.unreadCount > 0).length,
      direct: rows.filter((r) => r.kind === 'DIRECT').length,
      caregivers: rows.filter((r) => r.kind === 'DIRECT' && r.counterpartyRole === 'CAREGIVER')
        .length,
      families: rows.filter((r) => r.kind === 'DIRECT' && r.counterpartyRole === 'FAMILY_MEMBER')
        .length,
      visits: rows.filter((r) => r.kind === 'VISIT').length,
      announcements: rows.filter((r) => r.kind === 'ANNOUNCEMENT').length,
    };

    return { counts, rows: this.applyFolder(rows, folder, search) };
  }

  async getThread(adminId: string, conversationId: string): Promise<ThreadRead | null> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });
    if (conversation === null || conversation.adminId !== adminId) {
      return null;
    }

    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      include: { attachments: { orderBy: { createdAt: 'asc' } } },
    });

    const adminIds = [
      ...new Set(messages.map((m) => m.senderAdminId).filter((id): id is string => id !== null)),
    ];
    const userIds = [
      ...new Set(messages.map((m) => m.senderUserId).filter((id): id is string => id !== null)),
    ];
    if (conversation.counterpartyUserId !== null) {
      userIds.push(conversation.counterpartyUserId);
    }

    const [adminNames, owningAdmin, counterparties, linked, linkedVisit] = await Promise.all([
      this.adminNames(adminIds),
      this.owningAdmin(conversation.adminId),
      this.counterparties([...new Set(userIds)]),
      this.linkedRecipient(conversation.linkedCareRecipientId),
      this.linkedVisit(conversation.linkedVisitId),
    ]);

    const counterparty =
      conversation.counterpartyUserId === null
        ? null
        : (counterparties.get(conversation.counterpartyUserId) ?? null);

    const messageRows: ThreadMessageRow[] = messages.map((m) => ({
      id: m.id,
      senderType: String(m.senderType),
      senderAdminId: m.senderAdminId,
      senderUserId: m.senderUserId,
      senderName: this.senderName(
        m.senderType,
        m.senderAdminId,
        m.senderUserId,
        adminNames,
        counterparties,
      ),
      body: m.body,
      attachments: m.attachments.map((a) => ({
        id: a.id,
        storageKey: a.storageKey,
        fileName: a.fileName,
        sizeBytes: a.sizeBytes,
      })),
      createdAt: m.createdAt,
    }));

    return {
      id: conversation.id,
      kind: String(conversation.kind),
      title: conversation.title,
      adminId: conversation.adminId,
      counterpartyName: counterparty?.name ?? null,
      counterpartyRole: counterparty?.role ?? null,
      counterpartyStatus: counterparty?.status ?? null,
      adminName: owningAdmin?.name ?? null,
      adminRole: owningAdmin?.role ?? null,
      linkedRecipientId: conversation.linkedCareRecipientId,
      linkedRecipientName: linked?.name ?? null,
      linkedMedicationSummary: linked?.medicationSummary ?? null,
      linkedVisitId: conversation.linkedVisitId,
      linkedVisitReference: linkedVisit?.reference ?? null,
      linkedVisitType: linkedVisit?.visitType ?? null,
      linkedVisitStartMinute: linkedVisit?.startMinute ?? null,
      linkedVisitEndMinute: linkedVisit?.endMinute ?? null,
      linkedVisitDate: linkedVisit?.scheduledDate ?? null,
      sharedFiles: [...messages].reverse().flatMap((m) =>
        m.attachments.map((a) => ({
          id: a.id,
          storageKey: a.storageKey,
          fileName: a.fileName,
          sizeBytes: a.sizeBytes,
        })),
      ),
      messages: messageRows,
    };
  }

  async getAttachment(adminId: string, attachmentId: string): Promise<AttachmentPreviewRow | null> {
    const attachment = await this.prisma.messageAttachment.findUnique({
      where: { id: attachmentId },
      include: { message: { include: { conversation: true } } },
    });
    if (attachment === null || attachment.message.conversation.adminId !== adminId) {
      return null;
    }

    const message = attachment.message;
    const conversation = message.conversation;
    const [uploader, linkedVisit] = await Promise.all([
      this.uploader(message.senderType, message.senderAdminId, message.senderUserId),
      this.linkedVisit(conversation.linkedVisitId),
    ]);

    return {
      id: attachment.id,
      storageKey: attachment.storageKey,
      fileName: attachment.fileName,
      sizeBytes: attachment.sizeBytes,
      createdAt: attachment.createdAt,
      uploaderName: uploader?.name ?? null,
      uploaderRole: uploader?.role ?? null,
      linkedVisitId: conversation.linkedVisitId,
      linkedVisitReference: linkedVisit?.reference ?? null,
    };
  }

  private async uploader(
    senderType: string,
    senderAdminId: string | null,
    senderUserId: string | null,
  ): Promise<{ name: string; role: string } | null> {
    if (senderType === 'ADMIN' && senderAdminId !== null) {
      return this.owningAdmin(senderAdminId);
    }
    if (senderType === 'USER' && senderUserId !== null) {
      const info = (await this.counterparties([senderUserId])).get(senderUserId);
      return info ? { name: info.name, role: info.role } : null;
    }
    return null;
  }

  private applyFolder(rows: InboxRow[], folder: InboxFolder, search: string | null): InboxRow[] {
    const term = search?.trim().toLowerCase() ?? null;
    return rows.filter((r) => {
      if (!this.inFolder(r, folder)) {
        return false;
      }
      if (term !== null) {
        const haystack =
          `${r.title ?? ''} ${r.counterpartyName ?? ''} ${r.lastMessageBody ?? ''}`.toLowerCase();
        if (!haystack.includes(term)) {
          return false;
        }
      }
      return true;
    });
  }

  private inFolder(row: InboxRow, folder: InboxFolder): boolean {
    switch (folder) {
      case 'UNREAD':
        return row.unreadCount > 0;
      case 'DIRECT':
        return row.kind === 'DIRECT';
      case 'CAREGIVERS':
        return row.kind === 'DIRECT' && row.counterpartyRole === 'CAREGIVER';
      case 'FAMILIES':
        return row.kind === 'DIRECT' && row.counterpartyRole === 'FAMILY_MEMBER';
      case 'VISITS':
        return row.kind === 'VISIT';
      case 'ANNOUNCEMENTS':
        return row.kind === 'ANNOUNCEMENT';
      default:
        return true;
    }
  }

  private senderName(
    senderType: string,
    senderAdminId: string | null,
    senderUserId: string | null,
    adminNames: Map<string, string>,
    counterparties: Map<string, CounterpartyInfo>,
  ): string | null {
    if (senderType === 'ADMIN' && senderAdminId !== null) {
      return adminNames.get(senderAdminId) ?? null;
    }
    if (senderType === 'USER' && senderUserId !== null) {
      return counterparties.get(senderUserId)?.name ?? null;
    }
    return null;
  }

  private async unreadCounts(adminId: string): Promise<Map<string, number>> {
    const rows = await this.prisma.$queryRaw<Array<{ id: string; unread: bigint }>>(Prisma.sql`
      SELECT m."conversationId" AS id, COUNT(*) AS unread
      FROM messages m
      JOIN conversations c ON c.id = m."conversationId"
      WHERE c."adminId" = ${adminId}::uuid
        AND m."senderType" <> 'ADMIN'
        AND (c."adminLastReadAt" IS NULL OR m."createdAt" > c."adminLastReadAt")
      GROUP BY m."conversationId"
    `);
    return new Map(rows.map((r) => [r.id, Number(r.unread)]));
  }

  private async lastMessageBodies(conversationIds: string[]): Promise<Map<string, string>> {
    if (conversationIds.length === 0) {
      return new Map();
    }
    const rows = await this.prisma.message.findMany({
      where: { conversationId: { in: conversationIds } },
      orderBy: [{ conversationId: 'asc' }, { createdAt: 'desc' }],
      distinct: ['conversationId'],
      select: { conversationId: true, body: true },
    });
    return new Map(rows.map((r) => [r.conversationId, r.body]));
  }

  private async counterparties(userIds: string[]): Promise<Map<string, CounterpartyInfo>> {
    if (userIds.length === 0) {
      return new Map();
    }
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, firstName: true, lastName: true, userType: true, status: true },
    });
    return new Map(
      users.map((u) => [
        u.id,
        {
          name: `${u.firstName} ${u.lastName}`.trim(),
          role: String(u.userType),
          status: String(u.status),
        },
      ]),
    );
  }

  private async owningAdmin(adminId: string): Promise<{ name: string; role: string } | null> {
    const admin = await this.prisma.adminUser.findUnique({
      where: { id: adminId },
      select: { firstName: true, lastName: true, role: true },
    });
    if (admin === null) {
      return null;
    }
    return { name: `${admin.firstName} ${admin.lastName}`.trim(), role: String(admin.role) };
  }

  private async adminNames(ids: string[]): Promise<Map<string, string>> {
    if (ids.length === 0) {
      return new Map();
    }
    const rows = await this.prisma.adminUser.findMany({
      where: { id: { in: ids } },
      select: { id: true, firstName: true, lastName: true },
    });
    return new Map(rows.map((r) => [r.id, `${r.firstName} ${r.lastName}`.trim()]));
  }

  private async linkedRecipient(
    recipientId: string | null,
  ): Promise<{ name: string; medicationSummary: string | null } | null> {
    if (recipientId === null) {
      return null;
    }
    const recipient = await this.prisma.careRecipient.findUnique({
      where: { id: recipientId },
      select: { name: true },
    });
    if (recipient === null) {
      return null;
    }
    const medications = await this.prisma.medication.findMany({
      where: { careRecipientId: recipientId, status: 'ACTIVE' },
      orderBy: { position: 'asc' },
      take: 4,
      select: { name: true, dose: true },
    });
    const summary = medications
      .map((m) => (m.dose === null ? m.name : `${m.name} ${m.dose}`))
      .join(', ');
    return { name: recipient.name, medicationSummary: summary.length === 0 ? null : summary };
  }

  private async linkedVisit(visitId: string | null): Promise<LinkedVisitInfo | null> {
    if (visitId === null) {
      return null;
    }
    const visit = await this.prisma.visit.findUnique({
      where: { id: visitId },
      select: {
        sequence: true,
        scheduledDate: true,
        visitType: true,
        startMinute: true,
        endMinute: true,
      },
    });
    if (visit === null) {
      return null;
    }
    const year = visit.scheduledDate.getUTCFullYear();
    return {
      reference: `VIS-${year}-${String(visit.sequence).padStart(4, '0')}`,
      visitType: String(visit.visitType),
      startMinute: visit.startMinute,
      endMinute: visit.endMinute,
      scheduledDate: visit.scheduledDate,
    };
  }
}
