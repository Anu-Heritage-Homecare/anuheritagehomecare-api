/**
 * Domain owned lifecycle status for a client. Declared in the domain layer so it
 * is independent of the Prisma generated enum; the persistence mapper translates
 * between the two.
 */
export enum ClientStatus {
  Active = 'ACTIVE',
  Inactive = 'INACTIVE',
  Archived = 'ARCHIVED',
}
