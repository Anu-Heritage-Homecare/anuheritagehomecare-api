import { Inject, Injectable } from '@nestjs/common';
import { FamilyMemberStatus as PrismaFamilyStatus } from '@prisma/client';
import {
  FAMILY_DIRECTORY_READ_MODEL,
  FamilyDirectoryReadModel,
} from '../ports/family-directory-read.port';
import { FamilyListResult } from '../dto/family-directory.result';

interface ListFamiliesCommand {
  status: PrismaFamilyStatus | null;
  page: number;
  pageSize: number;
}

/** List the family directory, newest first, optionally filtered by status. Read only. */
@Injectable()
export class ListFamiliesUseCase {
  constructor(
    @Inject(FAMILY_DIRECTORY_READ_MODEL) private readonly reads: FamilyDirectoryReadModel,
  ) {}

  async execute(command: ListFamiliesCommand): Promise<FamilyListResult> {
    const page = await this.reads.list(command.status, command.page, command.pageSize);
    return {
      total: page.total,
      page: command.page,
      pageSize: command.pageSize,
      rows: page.rows.map((row) => ({
        id: row.id,
        reference: row.reference,
        name: row.name,
        relationship: row.relationship,
        hasAccount: row.hasAccount,
        phone: row.phone,
        email: row.email,
        linkedRecipientNames: row.linkedRecipientNames,
        billingStatus: row.billingStatus,
        status: String(row.status),
        unreadMessages: row.unreadMessages,
        lastActivity: row.lastActivity.toISOString(),
      })),
    };
  }
}
