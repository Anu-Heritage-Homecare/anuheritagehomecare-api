import { Integration } from './integration.entity';

/** Persistence port for third party integrations. */
export interface IntegrationRepository {
  list(): Promise<Integration[]>;
  findById(id: string): Promise<Integration | null>;
  save(integration: Integration): Promise<void>;
}

export const INTEGRATION_REPOSITORY = Symbol('INTEGRATION_REPOSITORY');
