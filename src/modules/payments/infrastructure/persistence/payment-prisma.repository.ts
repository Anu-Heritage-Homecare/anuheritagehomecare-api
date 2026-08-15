import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { Payment } from '../../domain/payment.entity';
import { PaymentRepository } from '../../domain/payment.repository';
import { PaymentMapper } from './payment.mapper';

/** Prisma backed adapter for the PaymentRepository port. */
@Injectable()
export class PaymentPrismaRepository implements PaymentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(payment: Payment): Promise<void> {
    const row = PaymentMapper.toPersistence(payment);
    await this.prisma.payment.upsert({
      where: { id: row.id },
      create: row,
      update: { status: row.status, updatedAt: row.updatedAt },
    });
  }

  async findById(id: string): Promise<Payment | null> {
    const row = await this.prisma.payment.findUnique({ where: { id } });
    return row ? PaymentMapper.toDomain(row) : null;
  }

  async findByProviderReference(providerReference: string): Promise<Payment | null> {
    const row = await this.prisma.payment.findUnique({ where: { providerReference } });
    return row ? PaymentMapper.toDomain(row) : null;
  }

  async listByOwner(ownerId: string): Promise<Payment[]> {
    const rows = await this.prisma.payment.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => PaymentMapper.toDomain(row));
  }
}
