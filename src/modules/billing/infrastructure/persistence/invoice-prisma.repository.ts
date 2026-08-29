import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { Invoice } from '../../domain/invoice.entity';
import { InvoiceRepository } from '../../domain/invoice.repository';
import { InvoiceMapper } from './invoice.mapper';

/**
 * Prisma backed adapter for the InvoiceRepository port. Saving upserts on the
 * subscription and period start unique key, so re-issuing a period overwrites the
 * invoice rather than duplicating it. History is listed newest period first.
 */
@Injectable()
export class InvoicePrismaRepository implements InvoiceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(invoice: Invoice): Promise<void> {
    const row = InvoiceMapper.toPersistence(invoice);
    const { id: _id, subscriptionId, periodStart, ...mutable } = row;
    await this.prisma.invoice.upsert({
      where: { subscriptionId_periodStart: { subscriptionId, periodStart } },
      create: row,
      update: mutable,
    });
  }

  async findById(id: string): Promise<Invoice | null> {
    const row = await this.prisma.invoice.findUnique({ where: { id } });
    return row ? InvoiceMapper.toDomain(row) : null;
  }

  async listForOwner(ownerId: string): Promise<Invoice[]> {
    const rows = await this.prisma.invoice.findMany({
      where: { ownerId },
      orderBy: { periodStart: 'desc' },
    });
    return rows.map((row) => InvoiceMapper.toDomain(row));
  }
}
