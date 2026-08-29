import { AdditionalCareRequest } from './additional-care-request.entity';

/**
 * Persistence port for the AdditionalCareRequest aggregate. Declared in the
 * domain; infrastructure supplies the Prisma adapter.
 */
export interface AdditionalCareRequestRepository {
  save(request: AdditionalCareRequest): Promise<void>;
  findById(id: string): Promise<AdditionalCareRequest | null>;
  listByCareRecipient(careRecipientId: string): Promise<AdditionalCareRequest[]>;
}

export const ADDITIONAL_CARE_REQUEST_REPOSITORY = Symbol('ADDITIONAL_CARE_REQUEST_REPOSITORY');
