import { Client } from '../../domain/client.entity';
import { ClientStatus } from '../../domain/client-status.enum';

/**
 * Read model returned by the application layer. It is a flat, serialisable
 * projection of the aggregate so the presentation layer never touches domain
 * objects directly.
 */
export interface ClientResult {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: ClientStatus;
  createdAt: string;
  updatedAt: string;
}

export function toClientResult(client: Client): ClientResult {
  return {
    id: client.id,
    firstName: client.name.firstName,
    lastName: client.name.lastName,
    email: client.email.value,
    phone: client.phone.value,
    status: client.status,
    createdAt: client.createdAt.toISOString(),
    updatedAt: client.updatedAt.toISOString(),
  };
}
