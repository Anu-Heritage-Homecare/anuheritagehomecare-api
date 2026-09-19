/**
 * The kinds of operational event recorded against a subscription. These feed both
 * the Activity Timeline and the Audit Log tabs; hours changes carry an hours delta.
 */
export enum SubscriptionOpsEventType {
  Created = 'CREATED',
  Activated = 'ACTIVATED',
  RenewalCompleted = 'RENEWAL_COMPLETED',
  HoursAdded = 'HOURS_ADDED',
  HoursAdjusted = 'HOURS_ADJUSTED',
  ExpiryExtended = 'EXPIRY_EXTENDED',
  Paused = 'PAUSED',
  Resumed = 'RESUMED',
  Cancelled = 'CANCELLED',
  AutoRenewEnabled = 'AUTO_RENEW_ENABLED',
  AutoRenewDisabled = 'AUTO_RENEW_DISABLED',
  CoordinatorAssigned = 'COORDINATOR_ASSIGNED',
  CaregiverAssigned = 'CAREGIVER_ASSIGNED',
  PlanChanged = 'PLAN_CHANGED',
}
