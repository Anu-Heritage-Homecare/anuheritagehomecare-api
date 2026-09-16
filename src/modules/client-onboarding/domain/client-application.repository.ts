import { ClientApplication } from './client-application.entity';

/**
 * Persistence port for the ClientApplication aggregate. Declared in the domain;
 * infrastructure supplies the Prisma adapter. Saving also appends any new stage
 * entries recorded on the aggregate.
 */
export interface ClientApplicationRepository {
  save(application: ClientApplication): Promise<void>;
  findById(id: string): Promise<ClientApplication | null>;
}

export const CLIENT_APPLICATION_REPOSITORY = Symbol('CLIENT_APPLICATION_REPOSITORY');
