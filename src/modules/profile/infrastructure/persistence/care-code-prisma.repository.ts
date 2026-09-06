import { Injectable } from '@nestjs/common';
import { CareCode as PrismaCareCode, CareCodeStatus as PrismaCareCodeStatus } from '@prisma/client';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { CareCode, CareCodeStatus } from '../../domain/care-code.entity';
import { CareCodeRepository } from '../../domain/care-code.repository';

const TO_DOMAIN_STATUS: Record<PrismaCareCodeStatus, CareCodeStatus> = {
  ACTIVE: CareCodeStatus.Active,
  REVOKED: CareCodeStatus.Revoked,
};
const TO_PERSISTENCE_STATUS: Record<CareCodeStatus, PrismaCareCodeStatus> = {
  [CareCodeStatus.Active]: 'ACTIVE',
  [CareCodeStatus.Revoked]: 'REVOKED',
};

/** Prisma backed adapter for the CareCodeRepository port. */
@Injectable()
export class CareCodePrismaRepository implements CareCodeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(code: CareCode): Promise<void> {
    const data = {
      ownerId: code.ownerId,
      code: code.code,
      status: TO_PERSISTENCE_STATUS[code.status],
      createdAt: code.createdAt,
      expiresAt: code.expiresAt,
    };
    await this.prisma.careCode.upsert({
      where: { id: code.id },
      create: { id: code.id, ...data },
      update: data,
    });
  }

  async findById(id: string): Promise<CareCode | null> {
    const row = await this.prisma.careCode.findUnique({ where: { id } });
    return row === null ? null : CareCodePrismaRepository.toDomain(row);
  }

  async findByCode(code: string): Promise<CareCode | null> {
    const row = await this.prisma.careCode.findUnique({ where: { code } });
    return row === null ? null : CareCodePrismaRepository.toDomain(row);
  }

  async findActiveForOwner(ownerId: string): Promise<CareCode | null> {
    const row = await this.prisma.careCode.findFirst({
      where: { ownerId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    });
    return row === null ? null : CareCodePrismaRepository.toDomain(row);
  }

  private static toDomain(row: PrismaCareCode): CareCode {
    return CareCode.rehydrate(row.id, {
      ownerId: row.ownerId,
      code: row.code,
      status: TO_DOMAIN_STATUS[row.status],
      createdAt: row.createdAt,
      expiresAt: row.expiresAt,
    });
  }
}
