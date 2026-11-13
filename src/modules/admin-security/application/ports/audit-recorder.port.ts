import { AuditCategory } from '../../domain/audit-category.enum';

/** An audit event to append to the trail. */
export interface AuditEventInput {
  actorAdminId: string | null;
  actorName: string | null;
  category: AuditCategory;
  action: string;
  summary: string;
  ipAddress?: string | null;
}

/**
 * Appends an entry to the back office audit trail. Exposed so any admin context can
 * record an action; today the admin-security actions use it.
 */
export interface AuditRecorder {
  record(event: AuditEventInput): Promise<void>;
}

export const AUDIT_RECORDER = Symbol('AUDIT_RECORDER');
