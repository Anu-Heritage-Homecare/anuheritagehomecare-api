import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { Client } from '../../domain/client.entity';
import { ClientRepository } from '../../domain/client.repository';
import { ClientMapper } from './client.mapper';

/**
 * Prisma backed adapter for the ClientRepository port. This is the only class in
 * the module that talks to the database. It persists via upsert so `save`
 * handles both new and existing aggregates idempotently.
 */
@Injectable()
export class ClientPrismaRepository implements ClientRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(client: Client): Promise<void> {
    const row = ClientMapper.toPersistence(client);
    await this.prisma.client.upsert({
      where: { id: row.id },
      create: row,
      update: {
        firstName: row.firstName,
        lastName: row.lastName,
        email: row.email,
        phone: row.phone,
        status: row.status,
        updatedAt: row.updatedAt,
      },
    });
  }

  async findById(id: string): Promise<Client | null> {
    const row = await this.prisma.client.findUnique({ where: { id } });
    return row ? ClientMapper.toDomain(row) : null;
  }

  async findByEmail(email: string): Promise<Client | null> {
    const row = await this.prisma.client.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    return row ? ClientMapper.toDomain(row) : null;
  }

  async existsByEmail(email: string): Promise<boolean> {
    const count = await this.prisma.client.count({
      where: { email: email.trim().toLowerCase() },
    });
    return count > 0;
  }
}
