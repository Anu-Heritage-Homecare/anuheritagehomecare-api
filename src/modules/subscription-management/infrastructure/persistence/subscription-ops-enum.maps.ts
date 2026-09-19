import { SubscriptionOpsEventType as PrismaEventType } from '@prisma/client';
import { SubscriptionOpsEventType } from '../../domain/subscription-ops-event-type.enum';

export const TO_DOMAIN_EVENT_TYPE: Record<PrismaEventType, SubscriptionOpsEventType> = {
  CREATED: SubscriptionOpsEventType.Created,
  ACTIVATED: SubscriptionOpsEventType.Activated,
  RENEWAL_COMPLETED: SubscriptionOpsEventType.RenewalCompleted,
  HOURS_ADDED: SubscriptionOpsEventType.HoursAdded,
  HOURS_ADJUSTED: SubscriptionOpsEventType.HoursAdjusted,
  EXPIRY_EXTENDED: SubscriptionOpsEventType.ExpiryExtended,
  PAUSED: SubscriptionOpsEventType.Paused,
  RESUMED: SubscriptionOpsEventType.Resumed,
  CANCELLED: SubscriptionOpsEventType.Cancelled,
  AUTO_RENEW_ENABLED: SubscriptionOpsEventType.AutoRenewEnabled,
  AUTO_RENEW_DISABLED: SubscriptionOpsEventType.AutoRenewDisabled,
  COORDINATOR_ASSIGNED: SubscriptionOpsEventType.CoordinatorAssigned,
  CAREGIVER_ASSIGNED: SubscriptionOpsEventType.CaregiverAssigned,
  PLAN_CHANGED: SubscriptionOpsEventType.PlanChanged,
};

export const TO_PERSISTENCE_EVENT_TYPE: Record<SubscriptionOpsEventType, PrismaEventType> = {
  [SubscriptionOpsEventType.Created]: 'CREATED',
  [SubscriptionOpsEventType.Activated]: 'ACTIVATED',
  [SubscriptionOpsEventType.RenewalCompleted]: 'RENEWAL_COMPLETED',
  [SubscriptionOpsEventType.HoursAdded]: 'HOURS_ADDED',
  [SubscriptionOpsEventType.HoursAdjusted]: 'HOURS_ADJUSTED',
  [SubscriptionOpsEventType.ExpiryExtended]: 'EXPIRY_EXTENDED',
  [SubscriptionOpsEventType.Paused]: 'PAUSED',
  [SubscriptionOpsEventType.Resumed]: 'RESUMED',
  [SubscriptionOpsEventType.Cancelled]: 'CANCELLED',
  [SubscriptionOpsEventType.AutoRenewEnabled]: 'AUTO_RENEW_ENABLED',
  [SubscriptionOpsEventType.AutoRenewDisabled]: 'AUTO_RENEW_DISABLED',
  [SubscriptionOpsEventType.CoordinatorAssigned]: 'COORDINATOR_ASSIGNED',
  [SubscriptionOpsEventType.CaregiverAssigned]: 'CAREGIVER_ASSIGNED',
  [SubscriptionOpsEventType.PlanChanged]: 'PLAN_CHANGED',
};
