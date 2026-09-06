/**
 * The authenticated admin attached to a request by the admin access token
 * strategy. Kept in the shared kernel so any admin bounded context can consume it
 * without depending on the admin identity context's internals. The role is a
 * plain string claim (compare against the AdminRole enum's values).
 */
export interface AdminPrincipal {
  adminUserId: string;
  role: string;
  email: string;
  /** The admin session this token was issued to (flags the current device). */
  sessionId: string;
}
