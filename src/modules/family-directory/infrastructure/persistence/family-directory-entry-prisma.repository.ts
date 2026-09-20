import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { FamilyDirectoryEntry } from '../../domain/family-directory-entry.entity';
import { FamilyDirectoryEntryRepository } from '../../domain/family-directory-entry.repository';
import {
  TO_DOMAIN_STATUS,
  TO_DOMAIN_SUBJECT_KIND,
  TO_PERSISTENCE_STATUS,
  TO_PERSISTENCE_SUBJECT_KIND,
} from './family-directory-enum.maps';

type EntryRow = Prisma.FamilyDirectoryEntryGetPayload<Record<string, never>>;

/** Prisma backed adapter for the FamilyDirectoryEntryRepository port. */
@Injectable()
export class FamilyDirectoryEntryPrismaRepository implements FamilyDirectoryEntryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(entry: FamilyDirectoryEntry): Promise<void> {
    const data = this.toData(entry);
    await this.prisma.familyDirectoryEntry.upsert({
      where: { id: entry.id },
      create: data,
      update: {
        fullName: data.fullName,
        phone: data.phone,
        email: data.email,
        relationship: data.relationship,
        primaryRecipientId: data.primaryRecipientId,
        status: data.status,
        quickNotes: data.quickNotes,
        emergencyContactVerified: data.emergencyContactVerified,
        updatedAt: data.updatedAt,
      },
    });
  }

  async saveMany(entries: FamilyDirectoryEntry[]): Promise<void> {
    if (entries.length === 0) {
      return;
    }
    await this.prisma.familyDirectoryEntry.createMany({
      data: entries.map((entry) => this.toData(entry)),
    });
  }

  async findById(id: string): Promise<FamilyDirectoryEntry | null> {
    const row = await this.prisma.familyDirectoryEntry.findUnique({ where: { id } });
    return row === null ? null : this.toDomain(row);
  }

  async findByUserId(userId: string): Promise<FamilyDirectoryEntry | null> {
    const row = await this.prisma.familyDirectoryEntry.findUnique({ where: { userId } });
    return row === null ? null : this.toDomain(row);
  }

  async findByIds(ids: string[]): Promise<FamilyDirectoryEntry[]> {
    if (ids.length === 0) {
      return [];
    }
    const rows = await this.prisma.familyDirectoryEntry.findMany({ where: { id: { in: ids } } });
    return rows.map((row) => this.toDomain(row));
  }

  private toData(entry: FamilyDirectoryEntry): Prisma.FamilyDirectoryEntryUncheckedCreateInput {
    return {
      id: entry.id,
      subjectKind: TO_PERSISTENCE_SUBJECT_KIND[entry.subjectKind],
      userId: entry.userId,
      fullName: entry.fullName,
      phone: entry.phone,
      email: entry.email,
      relationship: entry.relationship,
      primaryRecipientId: entry.primaryRecipientId,
      status: TO_PERSISTENCE_STATUS[entry.status],
      quickNotes: entry.quickNotes,
      emergencyContactVerified: entry.emergencyContactVerified,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    };
  }

  private toDomain(row: EntryRow): FamilyDirectoryEntry {
    return FamilyDirectoryEntry.rehydrate(row.id, {
      subjectKind: TO_DOMAIN_SUBJECT_KIND[row.subjectKind],
      userId: row.userId,
      fullName: row.fullName,
      phone: row.phone,
      email: row.email,
      relationship: row.relationship,
      primaryRecipientId: row.primaryRecipientId,
      status: TO_DOMAIN_STATUS[row.status],
      quickNotes: row.quickNotes,
      emergencyContactVerified: row.emergencyContactVerified,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
