import {
  BillingCycle as PrismaBillingCycle,
  BillingModel as PrismaBillingModel,
  CarePlanType as PrismaCarePlanType,
  Country as PrismaCountry,
  Currency as PrismaCurrency,
  ManagedPlanStatus as PrismaManagedPlanStatus,
} from '@prisma/client';
import { BillingModel } from '@modules/care-plans/domain/billing-model.enum';
import { CarePlanType } from '@modules/care-plans/domain/care-plan-type.enum';
import { Currency } from '@shared/domain/currency.enum';
import { BillingCycle } from '../../domain/billing-cycle.enum';
import { ManagedPlanStatus } from '../../domain/managed-plan-status.enum';

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

export const TO_DOMAIN_BILLING_MODEL: Record<PrismaBillingModel, BillingModel> = {
  HOURLY: BillingModel.Hourly,
  MONTHLY: BillingModel.Monthly,
};

export const TO_PERSISTENCE_BILLING_MODEL: Record<BillingModel, PrismaBillingModel> = {
  [BillingModel.Hourly]: 'HOURLY',
  [BillingModel.Monthly]: 'MONTHLY',
};

export const TO_DOMAIN_CURRENCY: Record<PrismaCurrency, Currency> = {
  USD: Currency.UnitedStatesDollar,
  NGN: Currency.NigerianNaira,
};

export const TO_PERSISTENCE_CURRENCY: Record<Currency, PrismaCurrency> = {
  [Currency.UnitedStatesDollar]: 'USD',
  [Currency.NigerianNaira]: 'NGN',
};

export const TO_DOMAIN_STATUS: Record<PrismaManagedPlanStatus, ManagedPlanStatus> = {
  ACTIVE: ManagedPlanStatus.Active,
  ARCHIVED: ManagedPlanStatus.Archived,
};

export const TO_PERSISTENCE_STATUS: Record<ManagedPlanStatus, PrismaManagedPlanStatus> = {
  [ManagedPlanStatus.Active]: 'ACTIVE',
  [ManagedPlanStatus.Archived]: 'ARCHIVED',
};

export const TO_DOMAIN_BILLING_CYCLE: Record<PrismaBillingCycle, BillingCycle> = {
  MONTHLY: BillingCycle.Monthly,
  QUARTERLY: BillingCycle.Quarterly,
  ANNUALLY: BillingCycle.Annually,
};

export const TO_PERSISTENCE_BILLING_CYCLE: Record<BillingCycle, PrismaBillingCycle> = {
  [BillingCycle.Monthly]: 'MONTHLY',
  [BillingCycle.Quarterly]: 'QUARTERLY',
  [BillingCycle.Annually]: 'ANNUALLY',
};

export const TO_DOMAIN_COUNTRY: Record<PrismaCountry, string> = {
  US: 'US',
  NG: 'NG',
};

export const TO_PERSISTENCE_COUNTRY: Record<string, PrismaCountry> = {
  US: 'US',
  NG: 'NG',
};
