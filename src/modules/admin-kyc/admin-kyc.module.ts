import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { KYC_AUDIT_READ_MODEL } from './application/ports/kyc-audit-read.port';
import { ListKycVerificationsUseCase } from './application/use-cases/list-kyc-verifications.use-case';
import { KycAuditReadPrisma } from './infrastructure/persistence/kyc-audit-read.prisma';
import { AdminKycController } from './presentation/admin-kyc.controller';

/**
 * Admin KYC panel: a read only audit over the KYC verifications table. PrismaService
 * is global, so no persistence module import is needed. Separate admin auth applies
 * at the controller.
 */
@Module({
  imports: [PassportModule],
  controllers: [AdminKycController],
  providers: [
    ListKycVerificationsUseCase,
    { provide: KYC_AUDIT_READ_MODEL, useClass: KycAuditReadPrisma },
  ],
})
export class AdminKycModule {}
