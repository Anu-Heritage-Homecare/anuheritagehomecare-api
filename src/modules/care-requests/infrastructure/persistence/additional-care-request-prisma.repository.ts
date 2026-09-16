import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { AdditionalCareRequest } from '../../domain/additional-care-request.entity';
import { AdditionalCareRequestRepository } from '../../domain/additional-care-request.repository';
import { AdditionalCareRequestMapper } from './additional-care-request.mapper';

/** Prisma backed adapter for the AdditionalCareRequestRepository port. */
@Injectable()
export class AdditionalCareRequestPrismaRepository implements AdditionalCareRequestRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(request: AdditionalCareRequest): Promise<void> {
    const row = AdditionalCareRequestMapper.toPersistence(request);
    await this.prisma.additionalCareRequest.upsert({
      where: { id: row.id },
      create: row,
      update: {
        careType: row.careType,
        requestedDate: row.requestedDate,
        startMinute: row.startMinute,
        durationMinutes: row.durationMinutes,
        reason: row.reason,
        status: row.status,
        actionedByAdminId: row.actionedByAdminId,
        actionedAt: row.actionedAt,
        decisionNote: row.decisionNote,
        updatedAt: row.updatedAt,
      },
    });
  }

  async findById(id: string): Promise<AdditionalCareRequest | null> {
    const row = await this.prisma.additionalCareRequest.findUnique({ where: { id } });
    return row ? AdditionalCareRequestMapper.toDomain(row) : null;
  }

  async listByCareRecipient(careRecipientId: string): Promise<AdditionalCareRequest[]> {
    const rows = await this.prisma.additionalCareRequest.findMany({
      where: { careRecipientId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => AdditionalCareRequestMapper.toDomain(row));
  }
}
