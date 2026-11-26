import { Injectable } from '@nestjs/common';
import { KycStatus } from '@prisma/client';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import {
  KycAuditPageView,
  KycAuditReadModel,
  KycMismatchView,
} from '../../application/ports/kyc-audit-read.port';

/**
 * Prisma read model for the admin KYC mismatch audit. Orders newest first and
 * resolves the owner's name in a single batched lookup. The provider reference and
 * full document number are never selected; only the masked remnant is returned.
 */
@Injectable()
export class KycAuditReadPrisma implements KycAuditReadModel {
  constructor(private readonly prisma: PrismaService) {}

  async listVerifications(
    status: KycStatus | null,
    page: number,
    pageSize: number,
  ): Promise<KycAuditPageView> {
    const where = status === null ? {} : { status };
    const [total, rows] = await Promise.all([
      this.prisma.kycVerification.count({ where }),
      this.prisma.kycVerification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: Math.max(0, (page - 1) * pageSize),
        take: pageSize,
        select: {
          id: true,
          ownerId: true,
          country: true,
          provider: true,
          documentType: true,
          claimedFirstName: true,
          claimedLastName: true,
          claimedDateOfBirth: true,
          maskedReference: true,
          faceMatch: true,
          mismatches: true,
          status: true,
          verifiedAt: true,
          createdAt: true,
        },
      }),
    ]);

    const ownerNames = await this.ownerNames(rows.map((row) => row.ownerId));

    return {
      total,
      rows: rows.map((row) => ({
        id: row.id,
        ownerId: row.ownerId,
        ownerName: ownerNames.get(row.ownerId) ?? null,
        country: row.country,
        provider: row.provider,
        documentType: row.documentType === null ? null : String(row.documentType),
        status: row.status,
        faceMatch: row.faceMatch === null ? null : String(row.faceMatch),
        maskedReference: row.maskedReference,
        claimedFirstName: row.claimedFirstName,
        claimedLastName: row.claimedLastName,
        claimedDateOfBirth: row.claimedDateOfBirth,
        mismatches: parseMismatches(row.mismatches),
        createdAt: row.createdAt,
        verifiedAt: row.verifiedAt,
      })),
    };
  }

  private async ownerNames(ids: string[]): Promise<Map<string, string>> {
    const unique = [...new Set(ids)];
    if (unique.length === 0) {
      return new Map();
    }
    const rows = await this.prisma.user.findMany({
      where: { id: { in: unique } },
      select: { id: true, firstName: true, lastName: true },
    });
    return new Map(rows.map((row) => [row.id, `${row.firstName} ${row.lastName}`.trim()]));
  }
}

/**
 * Parse the `mismatches` Json column defensively: it is `unknown` from Prisma, so
 * keep only array entries that are objects with string `field`/`provided`/`returned`,
 * and default to an empty list when the column is null or malformed.
 */
function parseMismatches(value: unknown): KycMismatchView[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const result: KycMismatchView[] = [];
  for (const entry of value) {
    if (
      typeof entry === 'object' &&
      entry !== null &&
      typeof (entry as Record<string, unknown>).field === 'string' &&
      typeof (entry as Record<string, unknown>).provided === 'string' &&
      typeof (entry as Record<string, unknown>).returned === 'string'
    ) {
      const record = entry as Record<string, string>;
      result.push({ field: record.field, provided: record.provided, returned: record.returned });
    }
  }
  return result;
}
