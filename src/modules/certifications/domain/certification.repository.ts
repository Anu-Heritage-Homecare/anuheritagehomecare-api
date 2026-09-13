import { Certification } from './certification.entity';

/** Persistence port for caregiver certifications. */
export interface CertificationRepository {
  save(certification: Certification): Promise<void>;
  /**
   * Certifications whose expiry is at or before `cutoff`, soonest first. Backs the
   * dashboard's Certification Expiring watch.
   */
  listExpiringBefore(cutoff: Date): Promise<Certification[]>;
  /** Every certification held by a caregiver, for the admin care team card. */
  listForCaregiver(caregiverId: string): Promise<Certification[]>;
}

export const CERTIFICATION_REPOSITORY = Symbol('CERTIFICATION_REPOSITORY');
