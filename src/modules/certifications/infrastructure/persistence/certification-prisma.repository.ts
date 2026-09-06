import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { Certification } from '../../domain/certification.entity';
import { CertificationRepository } from '../../domain/certification.repository';
import { CertificationMapper } from './certification.mapper';

/** Prisma backed adapter for the CertificationRepository port. */
@Injectable()
export class CertificationPrismaRepository implements CertificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(certification: Certification): Promise<void> {
    const row = CertificationMapper.toPersistence(certification);
    await this.prisma.certification.upsert({
      where: { id: row.id },
      create: row,
      update: {
        name: row.name,
        issuedAt: row.issuedAt,
        expiresAt: row.expiresAt,
      },
    });
  }

  async listExpiringBefore(cutoff: Date): Promise<Certification[]> {
    const rows = await this.prisma.certification.findMany({
      where: { expiresAt: { lte: cutoff } },
      orderBy: { expiresAt: 'asc' },
    });
    return rows.map((row) => CertificationMapper.toDomain(row));
  }
}
