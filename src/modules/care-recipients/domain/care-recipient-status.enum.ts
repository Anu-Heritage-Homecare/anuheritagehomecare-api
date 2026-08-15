/**
 * Lifecycle of a care recipient record. A DRAFT is created when the onboarding
 * wizard starts and holds partial data; it becomes ACTIVE once the family owner
 * finalises every required step.
 */
export enum CareRecipientStatus {
  Draft = 'DRAFT',
  Active = 'ACTIVE',
}
