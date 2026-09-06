import { Certification as PrismaCertification } from '@prisma/client';
import { Certification } from '../../domain/certification.entity';

/** Translates between the Prisma Certification row and the aggregate. */
export class CertificationMapper {
  static toDomain(row: PrismaCertification): Certification {
    return Certification.rehydrate(row.id, {
      caregiverId: row.caregiverId,
      name: row.name,
      issuedAt: row.issuedAt,
      expiresAt: row.expiresAt,
      createdAt: row.createdAt,
    });
  }

  static toPersistence(certification: Certification): PrismaCertification {
    return {
      id: certification.id,
      caregiverId: certification.caregiverId,
      name: certification.name,
      issuedAt: certification.issuedAt,
      expiresAt: certification.expiresAt,
      createdAt: certification.createdAt,
    };
  }
}
