import { AuditCategory } from '../../domain/audit-category.enum';

/** One audit trail entry, as the Audit Logs tab needs it. */
export interface AuditLogEntry {
  id: string;
  actorName: string | null;
  category: AuditCategory;
  action: string;
  summary: string;
  ipAddress: string | null;
  at: Date;
}

/** Read port over the admin audit events (the Audit Logs tab). */
export interface AdminAuditReadPort {
  page(
    page: number,
    pageSize: number,
    category: AuditCategory | null,
  ): Promise<{ entries: AuditLogEntry[]; total: number }>;
}

export const ADMIN_AUDIT_READ_PORT = Symbol('ADMIN_AUDIT_READ_PORT');
