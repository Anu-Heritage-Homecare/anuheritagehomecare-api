/**
 * The authenticated principal attached to a request by the access token
 * strategy. Kept in the shared kernel so any bounded context can consume it
 * without depending on the identity context's internals.
 */
export interface AuthenticatedPrincipal {
  userId: string;
  userType: string;
  /** ISO country code of the owner's market (for example US or NG). */
  country: string;
}
