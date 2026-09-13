import { Injectable } from '@nestjs/common';
import {
  DocumentCategory as PrismaCategory,
  DocumentStatus as PrismaStatus,
  Prisma,
} from '@prisma/client';
import { DocumentCategory } from '@modules/care-recipients/domain/document-category.enum';
import { DocumentStatus } from '@modules/care-recipients/domain/document-status.enum';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import {
  DocumentActivityView,
  DocumentCountsView,
  DocumentFilter,
  DocumentPageView,
  DocumentRowView,
  RecipientDocumentReadModel,
} from '../../application/ports/recipient-document-read.port';

const TO_DOMAIN_CATEGORY: Record<PrismaCategory, DocumentCategory> = {
  MEDICAL_RECORDS: DocumentCategory.MedicalRecords,
  CARE_PLANS: DocumentCategory.CarePlans,
  LEGAL: DocumentCategory.Legal,
  INSURANCE: DocumentCategory.Insurance,
  CERTIFICATIONS: DocumentCategory.Certifications,
  PHOTOS: DocumentCategory.Photos,
};

const TO_PERSISTENCE_CATEGORY: Record<DocumentCategory, PrismaCategory> = {
  [DocumentCategory.MedicalRecords]: 'MEDICAL_RECORDS',
  [DocumentCategory.CarePlans]: 'CARE_PLANS',
  [DocumentCategory.Legal]: 'LEGAL',
  [DocumentCategory.Insurance]: 'INSURANCE',
  [DocumentCategory.Certifications]: 'CERTIFICATIONS',
  [DocumentCategory.Photos]: 'PHOTOS',
};

const TO_DOMAIN_STATUS: Record<PrismaStatus, DocumentStatus> = {
  CURRENT: DocumentStatus.Current,
  PENDING_REVIEW: DocumentStatus.PendingReview,
  VERIFIED: DocumentStatus.Verified,
};

/** Prisma read model for the recipient Documents screen. */
@Injectable()
export class RecipientDocumentReadPrisma implements RecipientDocumentReadModel {
  constructor(private readonly prisma: PrismaService) {}

  async listPage(filter: DocumentFilter): Promise<DocumentPageView> {
    const where = this.whereForFilter(filter);
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.recipientDocument.count({ where }),
      this.prisma.recipientDocument.findMany({
        where,
        orderBy: this.orderBy(filter),
        skip: Math.max(0, (filter.page - 1) * filter.pageSize),
        take: filter.pageSize,
        select: {
          id: true,
          name: true,
          category: true,
          uploadedAt: true,
          uploadedByName: true,
          status: true,
          sizeBytes: true,
          expiresAt: true,
        },
      }),
    ]);
    return { total, rows: rows.map((row) => this.toRow(row)) };
  }

  async counts(recipientId: string, expiringCutoff: Date): Promise<DocumentCountsView> {
    const scoped: Prisma.RecipientDocumentWhereInput = { careRecipientId: recipientId };
    const [total, groups, pendingReview, expiringSoon, latest] = await Promise.all([
      this.prisma.recipientDocument.count({ where: scoped }),
      this.prisma.recipientDocument.groupBy({
        by: ['category'],
        where: scoped,
        _count: { _all: true },
        orderBy: { category: 'asc' },
      }),
      this.prisma.recipientDocument.count({
        where: { ...scoped, status: PrismaStatus.PENDING_REVIEW },
      }),
      this.prisma.recipientDocument.count({
        where: { ...scoped, expiresAt: { not: null, lte: expiringCutoff } },
      }),
      this.prisma.recipientDocument.findFirst({
        where: scoped,
        orderBy: { uploadedAt: 'desc' },
        select: { uploadedAt: true },
      }),
    ]);
    const byCategory = new Map<DocumentCategory, number>();
    for (const group of groups) {
      byCategory.set(TO_DOMAIN_CATEGORY[group.category], group._count._all);
    }
    return {
      total,
      byCategory,
      pendingReview,
      expiringSoon,
      lastUploadAt: latest?.uploadedAt ?? null,
    };
  }

  async recentActivity(recipientId: string, limit: number): Promise<DocumentActivityView[]> {
    const rows = await this.prisma.recipientDocument.findMany({
      where: { careRecipientId: recipientId },
      orderBy: { uploadedAt: 'desc' },
      take: limit,
      select: { name: true, uploadedByName: true, uploadedAt: true },
    });
    return rows.map((row) => ({
      documentName: row.name,
      uploadedByName: row.uploadedByName,
      at: row.uploadedAt,
    }));
  }

  private whereForFilter(filter: DocumentFilter): Prisma.RecipientDocumentWhereInput {
    const where: Prisma.RecipientDocumentWhereInput = { careRecipientId: filter.recipientId };
    if (filter.category !== null) {
      where.category = TO_PERSISTENCE_CATEGORY[filter.category];
    }
    const search = filter.search?.trim();
    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }
    return where;
  }

  private orderBy(filter: DocumentFilter): Prisma.RecipientDocumentOrderByWithRelationInput {
    const dir = filter.sortDirection === 'ASC' ? 'asc' : 'desc';
    switch (filter.sortField) {
      case 'NAME':
        return { name: dir };
      case 'SIZE':
        return { sizeBytes: dir };
      case 'DATE':
      default:
        return { uploadedAt: dir };
    }
  }

  private toRow(row: {
    id: string;
    name: string;
    category: PrismaCategory;
    uploadedAt: Date;
    uploadedByName: string | null;
    status: PrismaStatus;
    sizeBytes: number;
    expiresAt: Date | null;
  }): DocumentRowView {
    return {
      id: row.id,
      name: row.name,
      category: TO_DOMAIN_CATEGORY[row.category],
      uploadedAt: row.uploadedAt,
      uploadedByName: row.uploadedByName,
      status: TO_DOMAIN_STATUS[row.status],
      sizeBytes: row.sizeBytes,
      expiresAt: row.expiresAt,
    };
  }
}
