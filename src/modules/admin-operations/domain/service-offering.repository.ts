import { ServiceOffering } from './service-offering.entity';

/** Persistence port for service offerings. */
export interface ServiceOfferingRepository {
  list(): Promise<ServiceOffering[]>;
  findById(id: string): Promise<ServiceOffering | null>;
  save(offering: ServiceOffering): Promise<void>;
  delete(id: string): Promise<void>;
}

export const SERVICE_OFFERING_REPOSITORY = Symbol('SERVICE_OFFERING_REPOSITORY');
