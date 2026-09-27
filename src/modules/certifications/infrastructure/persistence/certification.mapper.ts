import {
  Certification as PrismaCertification,
  CredentialKind as PrismaCredentialKind,
} from '@prisma/client';
import { Certification } from '../../domain/certification.entity';
import { CredentialKind } from '../../domain/credential-kind.enum';

const TO_DOMAIN_KIND: Record<PrismaCredentialKind, CredentialKind> = {
  LICENSE: CredentialKind.License,
  CERTIFICATION: CredentialKind.Certification,
  BACKGROUND_CHECK: CredentialKind.BackgroundCheck,
  HEALTH_SCREENING: CredentialKind.HealthScreening,
  OTHER: CredentialKind.Other,
};

const TO_PERSISTENCE_KIND: Record<CredentialKind, PrismaCredentialKind> = {
  [CredentialKind.License]: 'LICENSE',
  [CredentialKind.Certification]: 'CERTIFICATION',
  [CredentialKind.BackgroundCheck]: 'BACKGROUND_CHECK',
  [CredentialKind.HealthScreening]: 'HEALTH_SCREENING',
  [CredentialKind.Other]: 'OTHER',
};

/** Translates between the Prisma Certification row and the aggregate. */
export class CertificationMapper {
  static toDomain(row: PrismaCertification): Certification {
    return Certification.rehydrate(row.id, {
      caregiverId: row.caregiverId,
      name: row.name,
      kind: TO_DOMAIN_KIND[row.kind],
      licenseNumber: row.licenseNumber,
      issuedAt: row.issuedAt,
      expiresAt: row.expiresAt,
      documentKey: row.documentKey,
      fileName: row.fileName,
      uploadedBy: row.uploadedBy,
      createdAt: row.createdAt,
    });
  }

  static toPersistence(certification: Certification): PrismaCertification {
    return {
      id: certification.id,
      caregiverId: certification.caregiverId,
      name: certification.name,
      kind: TO_PERSISTENCE_KIND[certification.kind],
      licenseNumber: certification.licenseNumber,
      issuedAt: certification.issuedAt,
      expiresAt: certification.expiresAt,
      documentKey: certification.documentKey,
      fileName: certification.fileName,
      uploadedBy: certification.uploadedBy,
      createdAt: certification.createdAt,
    };
  }
}
