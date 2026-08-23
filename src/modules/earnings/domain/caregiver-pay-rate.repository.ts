import { CaregiverPayRate } from './caregiver-pay-rate.entity';

/**
 * Persistence port for a caregiver's pay rate. The earnings estimate reads the
 * one rate belonging to a caregiver; there is no rate row until one is set, in
 * which case earnings estimate to zero.
 */
export interface CaregiverPayRateRepository {
  findByCaregiver(caregiverId: string): Promise<CaregiverPayRate | null>;
}

/** Injection token, since TypeScript interfaces do not exist at runtime. */
export const CAREGIVER_PAY_RATE_REPOSITORY = Symbol('CAREGIVER_PAY_RATE_REPOSITORY');
