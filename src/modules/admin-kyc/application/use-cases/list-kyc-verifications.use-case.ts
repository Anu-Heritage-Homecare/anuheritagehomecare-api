import { Inject, Injectable } from '@nestjs/common';
import { KycStatus as PrismaKycStatus } from '@prisma/client';
import { KYC_AUDIT_READ_MODEL, KycAuditReadModel } from '../ports/kyc-audit-read.port';
import { KycAuditListResult } from '../dto/kyc-audit-list.result';

interface ListKycVerificationsCommand {
  status: PrismaKycStatus | null;
  page: number;
  pageSize: number;
}

/**
 * List stored KYC verifications for the admin mismatch audit, newest first, with
 * the owner name resolved. Read only; the provider reference is never exposed.
 */
@Injectable()
export class ListKycVerificationsUseCase {
  constructor(@Inject(KYC_AUDIT_READ_MODEL) private readonly reads: KycAuditReadModel) {}

  async execute(command: ListKycVerificationsCommand): Promise<KycAuditListResult> {
    const page = await this.reads.listVerifications(command.status, command.page, command.pageSize);
    return {
      total: page.total,
      page: command.page,
      pageSize: command.pageSize,
      rows: page.rows.map((row) => ({
        id: row.id,
        owner: { id: row.ownerId, name: row.ownerName },
        country: row.country,
        provider: row.provider,
        documentType: row.documentType,
        status: row.status,
        faceMatch: row.faceMatch,
        maskedReference: row.maskedReference,
        claimed: {
          firstName: row.claimedFirstName,
          lastName: row.claimedLastName,
          dateOfBirth: row.claimedDateOfBirth.toISOString(),
        },
        mismatches: row.mismatches.map((mismatch) => ({
          field: mismatch.field,
          provided: mismatch.provided,
          returned: mismatch.returned,
        })),
        submittedAt: row.createdAt.toISOString(),
        verifiedAt: row.verifiedAt === null ? null : row.verifiedAt.toISOString(),
      })),
    };
  }
}
