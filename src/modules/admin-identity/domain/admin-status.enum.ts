/**
 * Lifecycle status of a back office account. A suspended admin keeps their record
 * but cannot authenticate. There is no self service closure: admins are managed
 * out of band.
 */
export enum AdminStatus {
  Active = 'ACTIVE',
  Suspended = 'SUSPENDED',
}
