import { Injectable } from '@nestjs/common';
import {
  Prisma,
  Integration as PrismaIntegration,
  IntegrationCategory as PrismaCategory,
  IntegrationStatus as PrismaStatus,
} from '@prisma/client';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { Integration, IntegrationConfig } from '../../domain/integration.entity';
import { IntegrationCategory } from '../../domain/integration-category.enum';
import { IntegrationStatus } from '../../domain/integration-status.enum';
import { IntegrationRepository } from '../../domain/integration.repository';

const TO_DOMAIN_STATUS: Record<PrismaStatus, IntegrationStatus> = {
  CONNECTED: IntegrationStatus.Connected,
  DISCONNECTED: IntegrationStatus.Disconnected,
};
const TO_PRISMA_STATUS: Record<IntegrationStatus, PrismaStatus> = {
  [IntegrationStatus.Connected]: 'CONNECTED',
  [IntegrationStatus.Disconnected]: 'DISCONNECTED',
};
const TO_DOMAIN_CATEGORY: Record<PrismaCategory, IntegrationCategory> = {
  COMMUNICATIONS: IntegrationCategory.Communications,
  PAYMENTS: IntegrationCategory.Payments,
  IDENTITY: IntegrationCategory.Identity,
  MAPS: IntegrationCategory.Maps,
  OTHER: IntegrationCategory.Other,
};

/** Prisma backed adapter for the IntegrationRepository port. */
@Injectable()
export class IntegrationPrismaRepository implements IntegrationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<Integration[]> {
    const rows = await this.prisma.integration.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return rows.map((row) => IntegrationPrismaRepository.toDomain(row));
  }

  async findById(id: string): Promise<Integration | null> {
    const row = await this.prisma.integration.findUnique({ where: { id } });
    return row ? IntegrationPrismaRepository.toDomain(row) : null;
  }

  async save(integration: Integration): Promise<void> {
    await this.prisma.integration.update({
      where: { id: integration.id },
      data: {
        status: TO_PRISMA_STATUS[integration.status],
        config:
          integration.config === null
            ? Prisma.DbNull
            : (integration.config as Prisma.InputJsonValue),
        connectedAt: integration.connectedAt,
        lastSyncAt: integration.lastSyncAt,
        updatedAt: integration.updatedAt,
      },
    });
  }

  private static toDomain(row: PrismaIntegration): Integration {
    return Integration.rehydrate(row.id, {
      key: row.key,
      name: row.name,
      category: TO_DOMAIN_CATEGORY[row.category],
      status: TO_DOMAIN_STATUS[row.status],
      description: row.description,
      config: (row.config as IntegrationConfig | null) ?? null,
      connectedAt: row.connectedAt,
      lastSyncAt: row.lastSyncAt,
      sortOrder: row.sortOrder,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
