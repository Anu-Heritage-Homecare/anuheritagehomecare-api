import { Client as PrismaClient, ClientStatus as PrismaClientStatus } from '@prisma/client';
import { Client } from '../../domain/client.entity';
import { ClientStatus } from '../../domain/client-status.enum';
import { EmailAddress } from '../../domain/value-objects/email-address.vo';
import { PersonName } from '../../domain/value-objects/person-name.vo';
import { PhoneNumber } from '../../domain/value-objects/phone-number.vo';

/**
 * Translates between the Prisma persistence model and the Client domain
 * aggregate. This mapper is the only place that knows both shapes, so the domain
 * stays free of Prisma types and the schema can evolve independently.
 */
export class ClientMapper {
  static toDomain(row: PrismaClient): Client {
    return Client.rehydrate(row.id, {
      name: PersonName.create(row.firstName, row.lastName),
      email: EmailAddress.create(row.email),
      phone: PhoneNumber.create(row.phone),
      status: ClientMapper.toDomainStatus(row.status),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  static toPersistence(client: Client): PrismaClient {
    return {
      id: client.id,
      firstName: client.name.firstName,
      lastName: client.name.lastName,
      email: client.email.value,
      phone: client.phone.value,
      status: ClientMapper.toPersistenceStatus(client.status),
      createdAt: client.createdAt,
      updatedAt: client.updatedAt,
    };
  }

  private static readonly TO_DOMAIN_STATUS: Record<PrismaClientStatus, ClientStatus> = {
    ACTIVE: ClientStatus.Active,
    INACTIVE: ClientStatus.Inactive,
    ARCHIVED: ClientStatus.Archived,
  };

  private static readonly TO_PERSISTENCE_STATUS: Record<ClientStatus, PrismaClientStatus> = {
    [ClientStatus.Active]: 'ACTIVE',
    [ClientStatus.Inactive]: 'INACTIVE',
    [ClientStatus.Archived]: 'ARCHIVED',
  };

  private static toDomainStatus(status: PrismaClientStatus): ClientStatus {
    return ClientMapper.TO_DOMAIN_STATUS[status];
  }

  private static toPersistenceStatus(status: ClientStatus): PrismaClientStatus {
    return ClientMapper.TO_PERSISTENCE_STATUS[status];
  }
}
