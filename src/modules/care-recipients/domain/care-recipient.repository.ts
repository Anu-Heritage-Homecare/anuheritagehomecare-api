import { CareRecipient } from './care-recipient.entity';

/**
 * Persistence port for the CareRecipient aggregate. Declared in the domain as an
 * interface; infrastructure supplies the Prisma adapter and the application
 * layer depends only on this abstraction (dependency inversion).
 */
export interface CareRecipientRepository {
  save(recipient: CareRecipient): Promise<void>;
  findById(id: string): Promise<CareRecipient | null>;
  findByIds(ids: string[]): Promise<CareRecipient[]>;
  listByOwner(ownerId: string): Promise<CareRecipient[]>;
}

/** Injection token, since TypeScript interfaces do not exist at runtime. */
export const CARE_RECIPIENT_REPOSITORY = Symbol('CARE_RECIPIENT_REPOSITORY');
