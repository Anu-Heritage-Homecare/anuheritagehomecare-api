/** One currency's pricing structure on a plan. */
export interface PlanPriceStructureResult {
  currency: string;
  monthlyPriceMinor: number | null;
  baseRateMinor: number | null;
  emergencyDispatchRateMinor: number | null;
  weekendPremiumMinor: number | null;
}

export interface PlanServiceResult {
  key: string;
  name: string;
  description: string;
  enabled: boolean;
}

export interface PlanVolumeDiscountResult {
  thresholdHours: number;
  percentBps: number;
}

export interface PlanVersionResult {
  versionNumber: number;
  summary: string;
  changedByAdminId: string | null;
  createdAt: string;
}

export interface PlanLifecycleResult {
  autoRenewal: boolean;
  billingCycle: string;
  gracePeriodDays: number;
  cancellationNoticeDays: number;
  lastUpdated: string;
}

/** The Analytics tab figures for a core plan; null for a custom plan. */
export interface PlanAnalyticsResult {
  subscribers: number;
  retentionPercent: number | null;
  renewalPercent: number | null;
  monthlyRevenueMinor: number;
}

/** The full plan detail behind every tab of the Care Plans screen. */
export interface ManagedPlanDetailResult {
  id: string;
  coreType: string | null;
  isCore: boolean;
  wiredToCheckout: boolean;
  name: string;
  description: string;
  targetAudience: string | null;
  status: string;
  billingModel: string;
  countriesEnabled: string[];
  supportedCurrencies: string[];
  minimumBillingHours: number | null;
  lifecycle: PlanLifecycleResult;
  pricing: PlanPriceStructureResult[];
  services: PlanServiceResult[];
  volumeDiscounts: PlanVolumeDiscountResult[];
  coverageAreas: string[];
  eligibilityRules: string[];
  analytics: PlanAnalyticsResult | null;
  currentVersion: number;
  versionHistory: PlanVersionResult[];
}
