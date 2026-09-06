import { AdminRole } from '../domain/admin-role.enum';

/**
 * The authenticated admin attached to a request by the admin access strategy.
 * Distinct from the mobile AuthenticatedPrincipal: it carries the admin role
 * rather than a user type and market, so admin routes authorise on role.
 */
export interface AdminPrincipal {
  adminUserId: string;
  role: AdminRole;
  email: string;
  /** The admin session this token was issued to (flags the current device). */
  sessionId: string;
}
