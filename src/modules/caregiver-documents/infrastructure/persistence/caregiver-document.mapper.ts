import {
  CaregiverDocument as PrismaCaregiverDocument,
  CaregiverDocumentCategory as PrismaCategory,
  CaregiverDocumentStatus as PrismaStatus,
} from '@prisma/client';
import { CaregiverDocument } from '../../domain/caregiver-document.entity';
import { CaregiverDocumentCategory } from '../../domain/caregiver-document-category.enum';
import { CaregiverDocumentStatus } from '../../domain/caregiver-document-status.enum';

const TO_DOMAIN_CATEGORY: Record<PrismaCategory, CaregiverDocumentCategory> = {
  LEGAL: CaregiverDocumentCategory.Legal,
  TAX: CaregiverDocumentCategory.Tax,
  PAYROLL: CaregiverDocumentCategory.Payroll,
  HR: CaregiverDocumentCategory.Hr,
  OTHER: CaregiverDocumentCategory.Other,
};

const TO_PERSISTENCE_CATEGORY: Record<CaregiverDocumentCategory, PrismaCategory> = {
  [CaregiverDocumentCategory.Legal]: 'LEGAL',
  [CaregiverDocumentCategory.Tax]: 'TAX',
  [CaregiverDocumentCategory.Payroll]: 'PAYROLL',
  [CaregiverDocumentCategory.Hr]: 'HR',
  [CaregiverDocumentCategory.Other]: 'OTHER',
};

const TO_DOMAIN_STATUS: Record<PrismaStatus, CaregiverDocumentStatus> = {
  ACTIVE: CaregiverDocumentStatus.Active,
  CURRENT: CaregiverDocumentStatus.Current,
  VERIFIED: CaregiverDocumentStatus.Verified,
  SIGNED: CaregiverDocumentStatus.Signed,
  EXPIRED: CaregiverDocumentStatus.Expired,
  ARCHIVED: CaregiverDocumentStatus.Archived,
};

const TO_PERSISTENCE_STATUS: Record<CaregiverDocumentStatus, PrismaStatus> = {
  [CaregiverDocumentStatus.Active]: 'ACTIVE',
  [CaregiverDocumentStatus.Current]: 'CURRENT',
  [CaregiverDocumentStatus.Verified]: 'VERIFIED',
  [CaregiverDocumentStatus.Signed]: 'SIGNED',
  [CaregiverDocumentStatus.Expired]: 'EXPIRED',
  [CaregiverDocumentStatus.Archived]: 'ARCHIVED',
};

/** Translates between the Prisma CaregiverDocument row and the aggregate. */
export class CaregiverDocumentMapper {
  static toDomain(row: PrismaCaregiverDocument): CaregiverDocument {
    return CaregiverDocument.rehydrate(row.id, {
      caregiverId: row.caregiverId,
      name: row.name,
      category: TO_DOMAIN_CATEGORY[row.category],
      status: TO_DOMAIN_STATUS[row.status],
      documentDate: row.documentDate,
      documentKey: row.documentKey,
      fileName: row.fileName,
      uploadedBy: row.uploadedBy,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  static toPersistence(document: CaregiverDocument): Omit<PrismaCaregiverDocument, 'updatedAt'> {
    return {
      id: document.id,
      caregiverId: document.caregiverId,
      name: document.name,
      category: TO_PERSISTENCE_CATEGORY[document.category],
      status: TO_PERSISTENCE_STATUS[document.status],
      documentDate: document.documentDate,
      documentKey: document.documentKey,
      fileName: document.fileName,
      uploadedBy: document.uploadedBy,
      createdAt: document.createdAt,
    };
  }
}
