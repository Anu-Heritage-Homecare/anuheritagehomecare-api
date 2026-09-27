import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { CaregiverDocument } from '../../domain/caregiver-document.entity';
import { CaregiverDocumentRepository } from '../../domain/caregiver-document.repository';
import { CaregiverDocumentMapper } from './caregiver-document.mapper';

/** Prisma backed adapter for the CaregiverDocumentRepository port. */
@Injectable()
export class CaregiverDocumentPrismaRepository implements CaregiverDocumentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(document: CaregiverDocument): Promise<void> {
    const row = CaregiverDocumentMapper.toPersistence(document);
    await this.prisma.caregiverDocument.upsert({
      where: { id: row.id },
      create: row,
      update: {
        name: row.name,
        category: row.category,
        status: row.status,
        documentDate: row.documentDate,
        documentKey: row.documentKey,
        fileName: row.fileName,
        uploadedBy: row.uploadedBy,
      },
    });
  }

  async findById(id: string): Promise<CaregiverDocument | null> {
    const row = await this.prisma.caregiverDocument.findUnique({ where: { id } });
    return row === null ? null : CaregiverDocumentMapper.toDomain(row);
  }

  async listForCaregiver(caregiverId: string): Promise<CaregiverDocument[]> {
    const rows = await this.prisma.caregiverDocument.findMany({
      where: { caregiverId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => CaregiverDocumentMapper.toDomain(row));
  }
}
