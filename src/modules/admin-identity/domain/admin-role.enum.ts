/**
 * The role of a back office account, which governs what an admin may do. Declared
 * in the domain layer so it is independent of the Prisma generated enum. Kept
 * deliberately small for now; finer grained permissions can be layered on later.
 */
export enum AdminRole {
  SuperAdmin = 'SUPER_ADMIN',
  OperationsManager = 'OPERATIONS_MANAGER',
  Coordinator = 'COORDINATOR',
}
