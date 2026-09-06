import { CareCode } from './care-code.entity';

/** Persistence port for care codes. */
export interface CareCodeRepository {
  save(code: CareCode): Promise<void>;
  findById(id: string): Promise<CareCode | null>;
  /** Look a code up by its human readable value (already normalised by the caller). */
  findByCode(code: string): Promise<CareCode | null>;
  /**
   * The owner's current active code, if any (newest first). Expiry is a domain
   * concern the caller checks; this returns the latest ACTIVE row.
   */
  findActiveForOwner(ownerId: string): Promise<CareCode | null>;
}

export const CARE_CODE_REPOSITORY = Symbol('CARE_CODE_REPOSITORY');
