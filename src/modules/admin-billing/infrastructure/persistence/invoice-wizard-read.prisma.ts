import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import {
  InvoiceAccountPreviewView,
  InvoiceWizardReadModel,
  RecipientServicePreviewView,
  RenderedCareView,
} from '../../application/ports/invoice-wizard-read.port';

/**
 * Prisma read model for the Create Invoice wizard. Composes a billing account's preview
 * from the family directory entry, its linked owner (contact and address), and the
 * outstanding balance and last invoice across the recipients billed under it.
 */
@Injectable()
export class InvoiceWizardReadPrisma implements InvoiceWizardReadModel {
  constructor(private readonly prisma: PrismaService) {}

  async accountPreview(id: string): Promise<InvoiceAccountPreviewView | null> {
    const entry = await this.prisma.familyDirectoryEntry.findUnique({
      where: { id },
      select: {
        id: true,
        sequence: true,
        createdAt: true,
        userId: true,
        fullName: true,
        accountName: true,
        email: true,
        relationship: true,
        phone: true,
        primaryRecipientId: true,
        status: true,
      },
    });
    if (entry === null) {
      return null;
    }

    const user =
      entry.userId === null
        ? null
        : await this.prisma.user.findUnique({
            where: { id: entry.userId },
            select: {
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              city: true,
              state: true,
              relationshipToRecipient: true,
            },
          });

    const recipientIds = await this.resolveRecipientIds(entry.userId, entry.primaryRecipientId);
    const invoices =
      recipientIds.length === 0
        ? []
        : await this.prisma.recipientInvoice.findMany({
            where: { careRecipientId: { in: recipientIds } },
            select: {
              sequence: true,
              issuedAt: true,
              amountMinor: true,
              insuranceCoveredMinor: true,
              currency: true,
              status: true,
            },
          });

    const outstandingBalanceMinor = invoices
      .filter((invoice) => invoice.status === 'PENDING')
      .reduce((sum, invoice) => sum + patientDue(invoice), 0);
    const lastInvoice = [...invoices].sort(
      (a, b) => b.issuedAt.getTime() - a.issuedAt.getTime(),
    )[0];

    const primaryContactName =
      user === null ? entry.fullName : `${user.firstName} ${user.lastName}`.trim();

    return {
      id: entry.id,
      sequence: entry.sequence,
      createdAt: entry.createdAt,
      name: entry.accountName ?? primaryContactName,
      status: entry.status,
      primaryContactName,
      primaryContactRelationship: entry.relationship ?? user?.relationshipToRecipient ?? null,
      contactEmail: entry.email ?? user?.email ?? null,
      contactPhone: user?.phone ?? entry.phone,
      billingAddress: user === null ? null : `${user.city}, ${user.state}`,
      outstandingBalanceMinor,
      currency: invoices[0]?.currency ?? null,
      lastInvoiceSequence: lastInvoice?.sequence ?? null,
      lastInvoiceIssuedAt: lastInvoice?.issuedAt ?? null,
      lastInvoiceStatus: lastInvoice?.status ?? null,
    };
  }

  async recipientServicePreview(recipientId: string): Promise<RecipientServicePreviewView | null> {
    const recipient = await this.prisma.careRecipient.findUnique({
      where: { id: recipientId },
      select: { id: true, name: true, careNeeds: true },
    });
    if (recipient === null) {
      return null;
    }

    const subscription =
      (await this.prisma.subscription.findFirst({
        where: { careRecipientId: recipientId, status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
        select: { planType: true },
      })) ??
      (await this.prisma.subscription.findFirst({
        where: { careRecipientId: recipientId },
        orderBy: { createdAt: 'desc' },
        select: { planType: true },
      }));
    const plan =
      subscription === null
        ? null
        : await this.prisma.carePlan.findUnique({
            where: { type: subscription.planType },
            select: { name: true },
          });

    // The caregiver on the most recently assigned visit for this recipient.
    const visit = await this.prisma.visit.findFirst({
      where: { careRecipientId: recipientId, caregiverId: { not: null } },
      orderBy: [{ assignedAt: 'desc' }, { scheduledDate: 'desc' }],
      select: { caregiverId: true },
    });
    const [caregiverUser, caregiverProfile] =
      visit?.caregiverId == null
        ? [null, null]
        : await Promise.all([
            this.prisma.user.findUnique({
              where: { id: visit.caregiverId },
              select: { firstName: true, lastName: true },
            }),
            this.prisma.caregiverProfile.findUnique({
              where: { userId: visit.caregiverId },
              select: { title: true },
            }),
          ]);

    return {
      id: recipient.id,
      name: recipient.name,
      carePlanModel: plan?.name ?? null,
      assignedCaregiverName:
        caregiverUser === null
          ? null
          : `${caregiverUser.firstName} ${caregiverUser.lastName}`.trim(),
      assignedCaregiverTitle: caregiverProfile?.title ?? null,
      careNeeds: recipient.careNeeds,
    };
  }

  async renderedCare(recipientId: string, from: Date, to: Date): Promise<RenderedCareView | null> {
    const recipient = await this.prisma.careRecipient.findUnique({
      where: { id: recipientId },
      select: { id: true },
    });
    if (recipient === null) {
      return null;
    }

    const visits = await this.prisma.visit.findMany({
      where: {
        careRecipientId: recipientId,
        status: 'COMPLETED',
        scheduledDate: { gte: from, lte: to },
      },
      select: {
        visitType: true,
        clockInAt: true,
        clockOutAt: true,
        startMinute: true,
        endMinute: true,
        breaks: { select: { startedAt: true, endedAt: true } },
      },
    });

    return {
      visits: visits.map((visit) => ({
        visitType: visit.visitType,
        clockInAt: visit.clockInAt,
        clockOutAt: visit.clockOutAt,
        startMinute: visit.startMinute,
        endMinute: visit.endMinute,
        breakMinutes: visit.breaks.reduce(
          (sum, b) =>
            sum + (b.endedAt === null ? 0 : (b.endedAt.getTime() - b.startedAt.getTime()) / 60_000),
          0,
        ),
      })),
    };
  }

  /** The care recipients billed under an entry (owned, or a single linked contact). */
  private async resolveRecipientIds(
    userId: string | null,
    primaryRecipientId: string | null,
  ): Promise<string[]> {
    if (userId !== null) {
      const recipients = await this.prisma.careRecipient.findMany({
        where: { ownerId: userId },
        select: { id: true },
      });
      return recipients.map((r) => r.id);
    }
    return primaryRecipientId === null ? [] : [primaryRecipientId];
  }
}

/** Patient due is the billed amount net of insurance; never negative. */
function patientDue(invoice: { amountMinor: number; insuranceCoveredMinor: number }): number {
  return Math.max(0, invoice.amountMinor - invoice.insuranceCoveredMinor);
}
