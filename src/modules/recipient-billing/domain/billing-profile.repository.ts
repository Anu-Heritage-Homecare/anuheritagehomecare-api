import { BillingProfile } from './billing-profile.entity';

/**
 * Persistence port for the per recipient billing and insurance profile. There is at
 * most one per recipient; the write upserts it.
 */
export interface BillingProfileRepository {
  findByRecipient(careRecipientId: string): Promise<BillingProfile | null>;
  save(profile: BillingProfile): Promise<void>;
}

export const BILLING_PROFILE_REPOSITORY = Symbol('BILLING_PROFILE_REPOSITORY');
