/**
 * Lifecycle of a care recipient record. A DRAFT is created when the onboarding
 * wizard starts and holds partial data; it becomes ACTIVE once the family owner
 * finalises every required step (or when an admin provisions the record directly).
 * The office can then pause care (ON_HOLD, awaiting clinical clearance) or close
 * the engagement (DISCHARGED, care transition completed).
 */
export enum CareRecipientStatus {
  Draft = 'DRAFT',
  Active = 'ACTIVE',
  OnHold = 'ON_HOLD',
  Discharged = 'DISCHARGED',
}
