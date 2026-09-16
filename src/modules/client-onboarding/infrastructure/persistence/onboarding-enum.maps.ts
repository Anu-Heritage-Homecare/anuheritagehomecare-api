import {
  CarePlanType as PrismaCarePlanType,
  Currency as PrismaCurrency,
  OnboardingPaymentStatus as PrismaPaymentStatus,
  OnboardingStage as PrismaStage,
  OnboardingStatus as PrismaStatus,
} from '@prisma/client';
import { CarePlanType } from '@modules/care-plans/domain/care-plan-type.enum';
import { Currency } from '@shared/domain/currency.enum';
import { OnboardingPaymentStatus } from '../../domain/onboarding-payment-status.enum';
import { OnboardingStage } from '../../domain/onboarding-stage.enum';
import { OnboardingStatus } from '../../domain/onboarding-status.enum';

export const TO_DOMAIN_STAGE: Record<PrismaStage, OnboardingStage> = {
  NEW_REQUEST: OnboardingStage.NewRequest,
  PLAN_SELECTED: OnboardingStage.PlanSelected,
  PAYMENT_RECEIVED: OnboardingStage.PaymentReceived,
  PENDING_REVIEW: OnboardingStage.PendingReview,
  DOC_VERIFIED: OnboardingStage.DocVerified,
  COORDINATOR_ASSIGNED: OnboardingStage.CoordinatorAssigned,
  CAREGIVER_SCHEDULED: OnboardingStage.CaregiverScheduled,
  SUB_ACTIVATED: OnboardingStage.SubActivated,
};

export const TO_PERSISTENCE_STAGE: Record<OnboardingStage, PrismaStage> = {
  [OnboardingStage.NewRequest]: 'NEW_REQUEST',
  [OnboardingStage.PlanSelected]: 'PLAN_SELECTED',
  [OnboardingStage.PaymentReceived]: 'PAYMENT_RECEIVED',
  [OnboardingStage.PendingReview]: 'PENDING_REVIEW',
  [OnboardingStage.DocVerified]: 'DOC_VERIFIED',
  [OnboardingStage.CoordinatorAssigned]: 'COORDINATOR_ASSIGNED',
  [OnboardingStage.CaregiverScheduled]: 'CAREGIVER_SCHEDULED',
  [OnboardingStage.SubActivated]: 'SUB_ACTIVATED',
};

export const TO_DOMAIN_STATUS: Record<PrismaStatus, OnboardingStatus> = {
  PENDING: OnboardingStatus.Pending,
  UNDER_REVIEW: OnboardingStatus.UnderReview,
  NEEDS_INFO: OnboardingStatus.NeedsInfo,
  APPROVED: OnboardingStatus.Approved,
  REJECTED: OnboardingStatus.Rejected,
};

export const TO_PERSISTENCE_STATUS: Record<OnboardingStatus, PrismaStatus> = {
  [OnboardingStatus.Pending]: 'PENDING',
  [OnboardingStatus.UnderReview]: 'UNDER_REVIEW',
  [OnboardingStatus.NeedsInfo]: 'NEEDS_INFO',
  [OnboardingStatus.Approved]: 'APPROVED',
  [OnboardingStatus.Rejected]: 'REJECTED',
};

export const TO_DOMAIN_PAYMENT_STATUS: Record<PrismaPaymentStatus, OnboardingPaymentStatus> = {
  PENDING: OnboardingPaymentStatus.Pending,
  PAID: OnboardingPaymentStatus.Paid,
};

export const TO_PERSISTENCE_PAYMENT_STATUS: Record<OnboardingPaymentStatus, PrismaPaymentStatus> = {
  [OnboardingPaymentStatus.Pending]: 'PENDING',
  [OnboardingPaymentStatus.Paid]: 'PAID',
};

export const TO_DOMAIN_PLAN_TYPE: Record<PrismaCarePlanType, CarePlanType> = {
  FLEXIBLE: CarePlanType.Flexible,
  STANDARD_MONTHLY: CarePlanType.StandardMonthly,
  PREMIUM: CarePlanType.Premium,
  LIVE_IN: CarePlanType.LiveIn,
};

export const TO_PERSISTENCE_PLAN_TYPE: Record<CarePlanType, PrismaCarePlanType> = {
  [CarePlanType.Flexible]: 'FLEXIBLE',
  [CarePlanType.StandardMonthly]: 'STANDARD_MONTHLY',
  [CarePlanType.Premium]: 'PREMIUM',
  [CarePlanType.LiveIn]: 'LIVE_IN',
};

export const TO_DOMAIN_CURRENCY: Record<PrismaCurrency, Currency> = {
  USD: Currency.UnitedStatesDollar,
  NGN: Currency.NigerianNaira,
};

export const TO_PERSISTENCE_CURRENCY: Record<Currency, PrismaCurrency> = {
  [Currency.UnitedStatesDollar]: 'USD',
  [Currency.NigerianNaira]: 'NGN',
};
