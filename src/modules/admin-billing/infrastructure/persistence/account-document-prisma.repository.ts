import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { AccountDocument } from '../../domain/account-document.entity';
import { AccountDocumentRepository } from '../../domain/account-document.repository';

interface Row {
  id: string;
  familyDirectoryEntryId: string;
  title: string;
  fileName: string;
  storageKey: string;
  sizeBytes: number;
  uploadedByAdminId: string | null;
  uploadedAt: Date;
}

/** Prisma adapter for the account documents repository. */
@Injectable()
export class AccountDocumentPrismaRepository implements AccountDocumentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async add(document: AccountDocument): Promise<void> {
    await this.prisma.accountDocument.create({
      data: {
        id: document.id,
        familyDirectoryEntryId: document.familyDirectoryEntryId,
        title: document.title,
        fileName: document.fileName,
        storageKey: document.storageKey,
        sizeBytes: document.sizeBytes,
        uploadedByAdminId: document.uploadedByAdminId,
        uploadedAt: document.uploadedAt,
      },
    });
  }

  async listByAccount(familyDirectoryEntryId: string): Promise<AccountDocument[]> {
    const rows = await this.prisma.accountDocument.findMany({
      where: { familyDirectoryEntryId },
      orderBy: { uploadedAt: 'desc' },
    });
    return rows.map((row) => this.toDomain(row));
  }

  async findById(id: string): Promise<AccountDocument | null> {
    const row = await this.prisma.accountDocument.findUnique({ where: { id } });
    return row === null ? null : this.toDomain(row);
  }

  async remove(id: string): Promise<void> {
    await this.prisma.accountDocument.delete({ where: { id } });
  }

  private toDomain(row: Row): AccountDocument {
    return AccountDocument.rehydrate(row.id, {
      familyDirectoryEntryId: row.familyDirectoryEntryId,
      title: row.title,
      fileName: row.fileName,
      storageKey: row.storageKey,
      sizeBytes: row.sizeBytes,
      uploadedByAdminId: row.uploadedByAdminId,
      uploadedAt: row.uploadedAt,
    });
  }
}
