import {
  Country as PrismaCountry,
  KycDocumentType as PrismaDocumentType,
  KycProvider as PrismaProvider,
  KycStatus as PrismaStatus,
  KycVerification as PrismaKycVerification,
} from '@prisma/client';
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
      documentType: KycVerificationMapper.TO_DOMAIN_DOCUMENT[row.documentType],
      maskedReference: row.maskedReference,
      providerReference: row.providerReference,
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
      documentType: KycVerificationMapper.TO_PERSISTENCE_DOCUMENT[verification.documentType],
      maskedReference: verification.maskedReference,
      providerReference: verification.providerReference,
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
    FAILED: KycStatus.Failed,
  };

  private static readonly TO_PERSISTENCE_STATUS: Record<KycStatus, PrismaStatus> = {
    [KycStatus.Pending]: 'PENDING',
    [KycStatus.Verified]: 'VERIFIED',
    [KycStatus.Failed]: 'FAILED',
  };

  private static readonly TO_DOMAIN_DOCUMENT: Record<PrismaDocumentType, KycDocumentType> = {
    SSN_LAST4: KycDocumentType.SsnLast4,
    NIN: KycDocumentType.Nin,
    PASSPORT: KycDocumentType.Passport,
  };

  private static readonly TO_PERSISTENCE_DOCUMENT: Record<KycDocumentType, PrismaDocumentType> = {
    [KycDocumentType.SsnLast4]: 'SSN_LAST4',
    [KycDocumentType.Nin]: 'NIN',
    [KycDocumentType.Passport]: 'PASSPORT',
  };
}
