import {
  Country as PrismaCountry,
  FaceMatchOutcome as PrismaFaceMatch,
  KycDocumentType as PrismaDocumentType,
  KycProvider as PrismaProvider,
  KycStatus as PrismaStatus,
  KycVerification as PrismaKycVerification,
  Prisma,
} from '@prisma/client';
import { FaceMatchOutcome } from '../../domain/face-match-outcome.enum';
import { IdentityMismatch } from '../../domain/identity-matcher';
import { KycDocumentType } from '../../domain/kyc-document-type.enum';
import { KycProvider } from '../../domain/kyc-provider.enum';
import { KycStatus } from '../../domain/kyc-status.enum';
import { KycVerification } from '../../domain/kyc-verification.entity';

/** Translates between the Prisma KYC row and the KycVerification aggregate. */
export class KycVerificationMapper {
  static toDomain(row: PrismaKycVerification): KycVerification {
    return KycVerification.rehydrate(row.id, {
      ownerId: row.ownerId,
      country: row.country,
      provider: KycVerificationMapper.TO_DOMAIN_PROVIDER[row.provider],
      documentType:
        row.documentType === null
          ? null
          : KycVerificationMapper.TO_DOMAIN_DOCUMENT[row.documentType],
      claimedFirstName: row.claimedFirstName,
      claimedLastName: row.claimedLastName,
      claimedDateOfBirth: row.claimedDateOfBirth,
      maskedReference: row.maskedReference,
      providerReference: row.providerReference,
      faceMatch:
        row.faceMatch === null ? null : KycVerificationMapper.TO_DOMAIN_FACE[row.faceMatch],
      mismatches: (row.mismatches as unknown as IdentityMismatch[] | null) ?? [],
      status: KycVerificationMapper.TO_DOMAIN_STATUS[row.status],
      verifiedAt: row.verifiedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  static toPersistence(verification: KycVerification): PrismaKycVerification {
    return {
      id: verification.id,
      ownerId: verification.ownerId,
      country: KycVerificationMapper.TO_PERSISTENCE_COUNTRY(verification.country),
      provider: KycVerificationMapper.TO_PERSISTENCE_PROVIDER[verification.provider],
      documentType:
        verification.documentType === null
          ? null
          : KycVerificationMapper.TO_PERSISTENCE_DOCUMENT[verification.documentType],
      claimedFirstName: verification.claimedFirstName,
      claimedLastName: verification.claimedLastName,
      claimedDateOfBirth: verification.claimedDateOfBirth,
      maskedReference: verification.maskedReference,
      providerReference: verification.providerReference,
      faceMatch:
        verification.faceMatch === null
          ? null
          : KycVerificationMapper.TO_PERSISTENCE_FACE[verification.faceMatch],
      mismatches: verification.mismatches as unknown as Prisma.JsonValue,
      status: KycVerificationMapper.TO_PERSISTENCE_STATUS[verification.status],
      verifiedAt: verification.verifiedAt,
      createdAt: verification.createdAt,
      updatedAt: verification.updatedAt,
    };
  }

  private static TO_PERSISTENCE_COUNTRY(country: string): PrismaCountry {
    if (country === 'US' || country === 'NG') {
      return country;
    }
    throw new Error(`Unsupported KYC country ${country}`);
  }

  private static readonly TO_DOMAIN_PROVIDER: Record<PrismaProvider, KycProvider> = {
    STRIPE: KycProvider.Stripe,
    QOREID: KycProvider.QoreId,
  };

  private static readonly TO_PERSISTENCE_PROVIDER: Record<KycProvider, PrismaProvider> = {
    [KycProvider.Stripe]: 'STRIPE',
    [KycProvider.QoreId]: 'QOREID',
  };

  private static readonly TO_DOMAIN_STATUS: Record<PrismaStatus, KycStatus> = {
    PENDING: KycStatus.Pending,
    VERIFIED: KycStatus.Verified,
    REJECTED: KycStatus.Rejected,
    FAILED: KycStatus.Failed,
  };

  private static readonly TO_PERSISTENCE_STATUS: Record<KycStatus, PrismaStatus> = {
    [KycStatus.Pending]: 'PENDING',
    [KycStatus.Verified]: 'VERIFIED',
    [KycStatus.Rejected]: 'REJECTED',
    [KycStatus.Failed]: 'FAILED',
  };

  private static readonly TO_DOMAIN_DOCUMENT: Record<PrismaDocumentType, KycDocumentType> = {
    NIN: KycDocumentType.Nin,
    DRIVERS_LICENSE: KycDocumentType.DriversLicense,
    PASSPORT: KycDocumentType.Passport,
  };

  private static readonly TO_PERSISTENCE_DOCUMENT: Record<KycDocumentType, PrismaDocumentType> = {
    [KycDocumentType.Nin]: 'NIN',
    [KycDocumentType.DriversLicense]: 'DRIVERS_LICENSE',
    [KycDocumentType.Passport]: 'PASSPORT',
  };

  private static readonly TO_DOMAIN_FACE: Record<PrismaFaceMatch, FaceMatchOutcome> = {
    MATCH: FaceMatchOutcome.Match,
    NO_MATCH: FaceMatchOutcome.NoMatch,
    NOT_AVAILABLE: FaceMatchOutcome.NotAvailable,
  };

  private static readonly TO_PERSISTENCE_FACE: Record<FaceMatchOutcome, PrismaFaceMatch> = {
    [FaceMatchOutcome.Match]: 'MATCH',
    [FaceMatchOutcome.NoMatch]: 'NO_MATCH',
    [FaceMatchOutcome.NotAvailable]: 'NOT_AVAILABLE',
  };
}
