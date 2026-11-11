import { Inject, Injectable } from '@nestjs/common';
import { AuditCategory } from '../../domain/audit-category.enum';
import {
  ADMIN_AUDIT_READ_PORT,
  AdminAuditReadPort,
  AuditLogEntry,
} from '../ports/admin-audit-read.port';

export interface GetAuditLogsCommand {
  page?: number;
  pageSize?: number;
  category?: AuditCategory | null;
}

export interface AuditLogsPageResult {
  entries: AuditLogEntry[];
  total: number;
  page: number;
  pageSize: number;
}

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

/** Use case: a page of the back office audit trail (the Audit Logs tab). */
@Injectable()
export class GetAuditLogsUseCase {
  constructor(@Inject(ADMIN_AUDIT_READ_PORT) private readonly audit: AdminAuditReadPort) {}

  async execute(command: GetAuditLogsCommand): Promise<AuditLogsPageResult> {
    const page = command.page && command.page > 0 ? command.page : 1;
    const pageSize = Math.min(
      command.pageSize && command.pageSize > 0 ? command.pageSize : DEFAULT_PAGE_SIZE,
      MAX_PAGE_SIZE,
    );
    const { entries, total } = await this.audit.page(page, pageSize, command.category ?? null);
    return { entries, total, page, pageSize };
  }
}
