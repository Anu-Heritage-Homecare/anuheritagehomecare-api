/**
 * Where a care circle membership sits in the join flow.
 *
 * PENDING — the person redeemed a care code and is awaiting the owner's approval;
 *           they have no access to any care information until approved.
 * ACTIVE  — the owner approved the request; the member has their granted access
 *           level.
 *
 * A rejected request is not a status: it is removed outright.
 */
export enum CareCircleMemberStatus {
  Pending = 'PENDING',
  Active = 'ACTIVE',
}
