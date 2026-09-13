import { Injectable } from '@nestjs/common';
import { DocumentCategory as PrismaCategory, DocumentStatus as PrismaStatus } from '@prisma/client';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { DocumentCategory } from '../../domain/document-category.enum';
import { DocumentStatus } from '../../domain/document-status.enum';
import { RecipientDocument } from '../../domain/recipient-document.entity';
import { RecipientDocumentRepository } from '../../domain/recipient-document.repository';

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

const TO_PERSISTENCE_STATUS: Record<DocumentStatus, PrismaStatus> = {
  [DocumentStatus.Current]: 'CURRENT',
  [DocumentStatus.PendingReview]: 'PENDING_REVIEW',
  [DocumentStatus.Verified]: 'VERIFIED',
};

/** Prisma backed adapter for the RecipientDocumentRepository port (write side). */
@Injectable()
export class RecipientDocumentPrismaRepository implements RecipientDocumentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async add(document: RecipientDocument): Promise<void> {
    await this.prisma.recipientDocument.create({
      data: {
        id: document.id,
        careRecipientId: document.careRecipientId,
        name: document.name,
        category: TO_PERSISTENCE_CATEGORY[document.category],
        storageKey: document.storageKey,
        sizeBytes: document.sizeBytes,
        uploadedByName: document.uploadedByName,
        status: TO_PERSISTENCE_STATUS[document.status],
        expiresAt: document.expiresAt,
        uploadedAt: document.uploadedAt,
        updatedAt: document.updatedAt,
      },
    });
  }

  async save(document: RecipientDocument): Promise<void> {
    await this.prisma.recipientDocument.update({
      where: { id: document.id },
      data: {
        name: document.name,
        category: TO_PERSISTENCE_CATEGORY[document.category],
        status: TO_PERSISTENCE_STATUS[document.status],
        expiresAt: document.expiresAt,
      },
    });
  }

  async findById(id: string): Promise<RecipientDocument | null> {
    const row = await this.prisma.recipientDocument.findUnique({ where: { id } });
    if (row === null) {
      return null;
    }
    return RecipientDocument.rehydrate(row.id, {
      careRecipientId: row.careRecipientId,
      name: row.name,
      category: TO_DOMAIN_CATEGORY[row.category],
      storageKey: row.storageKey,
      sizeBytes: row.sizeBytes,
      uploadedByName: row.uploadedByName,
      status: TO_DOMAIN_STATUS[row.status],
      expiresAt: row.expiresAt,
      uploadedAt: row.uploadedAt,
      updatedAt: row.updatedAt,
    });
  }

  async remove(id: string): Promise<void> {
    await this.prisma.recipientDocument.delete({ where: { id } });
  }
}
