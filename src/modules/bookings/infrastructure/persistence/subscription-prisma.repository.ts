import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { Subscription } from '../../domain/subscription.entity';
import { SubscriptionRepository } from '../../domain/subscription.repository';
import { SubscriptionMapper } from './subscription.mapper';

/** Prisma backed adapter for the SubscriptionRepository port. */
@Injectable()
export class SubscriptionPrismaRepository implements SubscriptionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(subscription: Subscription): Promise<void> {
    const row = SubscriptionMapper.toPersistence(subscription);
    await this.prisma.subscription.upsert({
      where: { id: row.id },
      create: row,
      update: {
        startDate: row.startDate,
        currency: row.currency,
        monthlyPriceMinor: row.monthlyPriceMinor,
        status: row.status,
        updatedAt: row.updatedAt,
      },
    });
  }

  async findById(id: string): Promise<Subscription | null> {
    const row = await this.prisma.subscription.findUnique({ where: { id } });
    return row ? SubscriptionMapper.toDomain(row) : null;
  }

  async listByOwner(ownerId: string): Promise<Subscription[]> {
    const rows = await this.prisma.subscription.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => SubscriptionMapper.toDomain(row));
  }
}
