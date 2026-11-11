import { Injectable } from '@nestjs/common';
import { Prisma, ApiKeyStatus as PrismaStatus } from '@prisma/client';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { ApiKey } from '../../domain/api-key.entity';
import { ApiKeyStatus } from '../../domain/api-key-status.enum';
import { ApiKeyRepository } from '../../domain/api-key.repository';
import { ORGANIZATION_SINGLETON_ID } from '../../domain/organization.repository';

const TO_DOMAIN_STATUS: Record<PrismaStatus, ApiKeyStatus> = {
  ACTIVE: ApiKeyStatus.Active,
  REVOKED: ApiKeyStatus.Revoked,
};
const TO_PRISMA_STATUS: Record<ApiKeyStatus, PrismaStatus> = {
  [ApiKeyStatus.Active]: 'ACTIVE',
  [ApiKeyStatus.Revoked]: 'REVOKED',
};

const API_KEY_INCLUDE = {
  createdBy: { select: { firstName: true, lastName: true } },
} satisfies Prisma.ApiKeyInclude;

type ApiKeyRow = Prisma.ApiKeyGetPayload<{ include: typeof API_KEY_INCLUDE }>;

/** Prisma backed adapter for the ApiKeyRepository port. */
@Injectable()
export class ApiKeyPrismaRepository implements ApiKeyRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<ApiKey[]> {
    const rows = await this.prisma.apiKey.findMany({
      where: { organizationId: ORGANIZATION_SINGLETON_ID },
      orderBy: { createdAt: 'desc' },
      include: API_KEY_INCLUDE,
    });
    return rows.map((row) => ApiKeyPrismaRepository.toDomain(row));
  }

  async findById(id: string): Promise<ApiKey | null> {
    const row = await this.prisma.apiKey.findUnique({ where: { id }, include: API_KEY_INCLUDE });
    return row ? ApiKeyPrismaRepository.toDomain(row) : null;
  }

  async findByHash(keyHash: string): Promise<ApiKey | null> {
    const row = await this.prisma.apiKey.findUnique({
      where: { keyHash },
      include: API_KEY_INCLUDE,
    });
    return row ? ApiKeyPrismaRepository.toDomain(row) : null;
  }

  async save(apiKey: ApiKey): Promise<void> {
    const data = {
      name: apiKey.name,
      keyPrefix: apiKey.keyPrefix,
      last4: apiKey.last4,
      keyHash: apiKey.keyHash,
      scopes: [...apiKey.scopes],
      rateLimitPerHour: apiKey.rateLimitPerHour,
      status: TO_PRISMA_STATUS[apiKey.status],
      createdById: apiKey.createdById,
      lastUsedAt: apiKey.lastUsedAt,
      hourBucket: apiKey.hourBucket,
      hourCount: apiKey.hourCount,
      dayBucket: apiKey.dayBucket,
      dayCount: apiKey.dayCount,
      weekBucket: apiKey.weekBucket,
      weekCount: apiKey.weekCount,
      revokedAt: apiKey.revokedAt,
      updatedAt: apiKey.updatedAt,
    };
    await this.prisma.$transaction([
      this.ensureOrganization(),
      this.prisma.apiKey.upsert({
        where: { id: apiKey.id },
        create: {
          id: apiKey.id,
          organizationId: ORGANIZATION_SINGLETON_ID,
          createdAt: apiKey.createdAt,
          ...data,
        },
        update: data,
      }),
    ]);
  }

  /** Create the singleton organization row if absent, so the key's FK holds. */
  private ensureOrganization(): Prisma.PrismaPromise<unknown> {
    return this.prisma.organization.upsert({
      where: { id: ORGANIZATION_SINGLETON_ID },
      create: { id: ORGANIZATION_SINGLETON_ID },
      update: {},
    });
  }

  private static toDomain(row: ApiKeyRow): ApiKey {
    const createdByName = row.createdBy
      ? `${row.createdBy.firstName} ${row.createdBy.lastName}`.trim()
      : null;
    return ApiKey.rehydrate(row.id, {
      name: row.name,
      keyPrefix: row.keyPrefix,
      last4: row.last4,
      keyHash: row.keyHash,
      scopes: row.scopes,
      rateLimitPerHour: row.rateLimitPerHour,
      status: TO_DOMAIN_STATUS[row.status],
      createdById: row.createdById,
      createdByName,
      lastUsedAt: row.lastUsedAt,
      hourBucket: row.hourBucket,
      hourCount: row.hourCount,
      dayBucket: row.dayBucket,
      dayCount: row.dayCount,
      weekBucket: row.weekBucket,
      weekCount: row.weekCount,
      revokedAt: row.revokedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
