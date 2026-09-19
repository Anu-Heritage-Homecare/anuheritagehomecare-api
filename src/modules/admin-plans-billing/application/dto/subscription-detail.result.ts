/** One event on the subscription timeline / audit log. */
export interface SubscriptionEventResult {
  type: string;
  detail: string;
  hoursDelta: number | null;
  actorAdminId: string | null;
  actorLabel: string | null;
  occurredAt: string;
}

/** One note on the subscription. */
export interface SubscriptionNoteResult {
  body: string;
  authorAdminId: string | null;
  authorName: string | null;
  createdAt: string;
}

/** One payment against the subscription. */
export interface SubscriptionPaymentResult {
  reference: string;
  provider: string;
  amountMinor: number;
  status: string;
  createdAt: string;
}

/** The flexible hours allocation for the current cycle. */
export interface FlexibleHoursAllocationResult {
  allocatedHours: number;
  usedHours: number;
  remainingHours: number;
  percentUsed: number;
  cycleEndsAt: string | null;
}

/** The full subscription detail behind every tab. */
export interface SubscriptionDetailResult {
  id: string;
  planType: string;
  planName: string;
  status: string;
  autoRenew: boolean;
  monthlyPriceMinor: number;
  currency: string;
  billingCycle: string;
  contractStartDate: string;
  activationDate: string | null;
  nextRenewalDate: string | null;
  patient: {
    name: string | null;
    age: number | null;
    gender: string | null;
    conditions: string[];
  };
  primaryContact: {
    name: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
  };
  coordinatorName: string | null;
  caregiverName: string | null;
  flexibleHours: FlexibleHoursAllocationResult | null;
  timeline: SubscriptionEventResult[];
  notes: SubscriptionNoteResult[];
  payments: SubscriptionPaymentResult[];
  /** False when no operational overlay has been created for this subscription yet. */
  hasOverlay: boolean;
}
