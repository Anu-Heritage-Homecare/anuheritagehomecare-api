import { Client } from './client.entity';

/**
 * Persistence port for the Client aggregate. Declared in the domain layer as an
 * interface (a port); the infrastructure layer supplies the Prisma adapter. The
 * application layer depends only on this abstraction (dependency inversion).
 */
export interface ClientRepository {
  save(client: Client): Promise<void>;
  findById(id: string): Promise<Client | null>;
  findByEmail(email: string): Promise<Client | null>;
  existsByEmail(email: string): Promise<boolean>;
}

/** Injection token, since TypeScript interfaces do not exist at runtime. */
export const CLIENT_REPOSITORY = Symbol('CLIENT_REPOSITORY');
