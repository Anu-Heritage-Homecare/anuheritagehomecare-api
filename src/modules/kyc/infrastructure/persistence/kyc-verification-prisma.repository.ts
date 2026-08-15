import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { KycVerification } from '../../domain/kyc-verification.entity';
import { KycVerificationRepository } from '../../domain/kyc-verification.repository';
import { KycVerificationMapper } from './kyc-verification.mapper';

/** Prisma backed adapter for the KycVerificationRepository port. */
@Injectable()
export class KycVerificationPrismaRepository implements KycVerificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(verification: KycVerification): Promise<void> {
    const row = KycVerificationMapper.toPersistence(verification);
    await this.prisma.kycVerification.upsert({
      where: { id: row.id },
      create: row,
      update: {
        country: row.country,
        provider: row.provider,
        documentType: row.documentType,
        maskedReference: row.maskedReference,
        providerReference: row.providerReference,
        status: row.status,
        verifiedAt: row.verifiedAt,
        updatedAt: row.updatedAt,
      },
    });
  }

  async findByOwner(ownerId: string): Promise<KycVerification | null> {
    const row = await this.prisma.kycVerification.findUnique({ where: { ownerId } });
    return row ? KycVerificationMapper.toDomain(row) : null;
  }

  async findByProviderReference(providerReference: string): Promise<KycVerification | null> {
    const row = await this.prisma.kycVerification.findFirst({ where: { providerReference } });
    return row ? KycVerificationMapper.toDomain(row) : null;
  }
}
