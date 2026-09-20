import { CaregiverProfile } from './caregiver-profile.entity';

/**
 * Persistence port for the CaregiverProfile aggregate. Saving also appends any new
 * notes recorded on the aggregate.
 */
export interface CaregiverProfileRepository {
  save(profile: CaregiverProfile): Promise<void>;
  findById(id: string): Promise<CaregiverProfile | null>;
  findByUserId(userId: string): Promise<CaregiverProfile | null>;
}

export const CAREGIVER_PROFILE_REPOSITORY = Symbol('CAREGIVER_PROFILE_REPOSITORY');
