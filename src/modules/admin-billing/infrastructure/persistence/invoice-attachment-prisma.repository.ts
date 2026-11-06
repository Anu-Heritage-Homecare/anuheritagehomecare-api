import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { InvoiceAttachment } from '../../domain/invoice-attachment.entity';
import { InvoiceAttachmentRepository } from '../../domain/invoice-attachment.repository';

interface Row {
  id: string;
  invoiceId: string;
  title: string;
  fileName: string;
  storageKey: string;
  sizeBytes: number;
  uploadedByAdminId: string | null;
  uploadedAt: Date;
}

/** Prisma adapter for the invoice attachments repository. */
@Injectable()
export class InvoiceAttachmentPrismaRepository implements InvoiceAttachmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async add(attachment: InvoiceAttachment): Promise<void> {
    await this.prisma.invoiceAttachment.create({
      data: {
        id: attachment.id,
        invoiceId: attachment.invoiceId,
        title: attachment.title,
        fileName: attachment.fileName,
        storageKey: attachment.storageKey,
        sizeBytes: attachment.sizeBytes,
        uploadedByAdminId: attachment.uploadedByAdminId,
        uploadedAt: attachment.uploadedAt,
      },
    });
  }

  async listByInvoice(invoiceId: string): Promise<InvoiceAttachment[]> {
    const rows = await this.prisma.invoiceAttachment.findMany({
      where: { invoiceId },
      orderBy: { uploadedAt: 'desc' },
    });
    return rows.map((row) => this.toDomain(row));
  }

  async findById(id: string): Promise<InvoiceAttachment | null> {
    const row = await this.prisma.invoiceAttachment.findUnique({ where: { id } });
    return row === null ? null : this.toDomain(row);
  }

  async remove(id: string): Promise<void> {
    await this.prisma.invoiceAttachment.delete({ where: { id } });
  }

  async invoiceExists(invoiceId: string): Promise<boolean> {
    const invoice = await this.prisma.recipientInvoice.findUnique({
      where: { id: invoiceId },
      select: { id: true },
    });
    return invoice !== null;
  }

  private toDomain(row: Row): InvoiceAttachment {
    return InvoiceAttachment.rehydrate(row.id, {
      invoiceId: row.invoiceId,
      title: row.title,
      fileName: row.fileName,
      storageKey: row.storageKey,
      sizeBytes: row.sizeBytes,
      uploadedByAdminId: row.uploadedByAdminId,
      uploadedAt: row.uploadedAt,
    });
  }
}
