import { Injectable } from '@nestjs/common';
import { CareCircleMember as PrismaCareCircleMember } from '@prisma/client';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { CareCircleMember } from '../../domain/care-circle-member.entity';
import { CareCircleRepository } from '../../domain/care-circle.repository';

/** Prisma backed adapter for the CareCircleRepository port. */
@Injectable()
export class CareCirclePrismaRepository implements CareCircleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listForOwner(ownerId: string): Promise<CareCircleMember[]> {
    const rows = await this.prisma.careCircleMember.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((row) => CareCirclePrismaRepository.toDomain(row));
  }

  async findById(id: string): Promise<CareCircleMember | null> {
    const row = await this.prisma.careCircleMember.findUnique({ where: { id } });
    return row === null ? null : CareCirclePrismaRepository.toDomain(row);
  }

  async save(member: CareCircleMember): Promise<void> {
    const data = {
      ownerId: member.ownerId,
      name: member.name,
      relationship: member.relationship,
      phone: member.phone,
      email: member.email,
    };
    await this.prisma.careCircleMember.upsert({
      where: { id: member.id },
      create: { id: member.id, ...data },
      update: data,
    });
  }

  async delete(ownerId: string, id: string): Promise<void> {
    await this.prisma.careCircleMember.deleteMany({ where: { id, ownerId } });
  }

  private static toDomain(row: PrismaCareCircleMember): CareCircleMember {
    return CareCircleMember.rehydrate(row.id, {
      ownerId: row.ownerId,
      name: row.name,
      relationship: row.relationship,
      phone: row.phone,
      email: row.email,
      createdAt: row.createdAt,
    });
  }
}
