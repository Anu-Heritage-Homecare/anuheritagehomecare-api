/** One card in the Active Care Plan Catalogue. */
export interface ManagedPlanCardResult {
  id: string;
  coreType: string | null;
  isCore: boolean;
  wiredToCheckout: boolean;
  name: string;
  description: string;
  status: string;
  billingModel: string;
  monthlyPriceMinor: number | null;
  currency: string;
  subscribers: number;
  retentionPercent: number | null;
  estRevenueMinor: number;
}

export interface ManagedPlanCatalogueResult {
  currency: string;
  plans: ManagedPlanCardResult[];
}
