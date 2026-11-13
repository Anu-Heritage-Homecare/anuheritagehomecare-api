import { Injectable } from '@nestjs/common';
import { ServiceOffering as PrismaServiceOffering } from '@prisma/client';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { ServiceOffering } from '../../domain/service-offering.entity';
import { ServiceOfferingRepository } from '../../domain/service-offering.repository';

/** Prisma backed adapter for the ServiceOfferingRepository port. */
@Injectable()
export class ServiceOfferingPrismaRepository implements ServiceOfferingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<ServiceOffering[]> {
    const rows = await this.prisma.serviceOffering.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return rows.map((row) => ServiceOfferingPrismaRepository.toDomain(row));
  }

  async findById(id: string): Promise<ServiceOffering | null> {
    const row = await this.prisma.serviceOffering.findUnique({ where: { id } });
    return row ? ServiceOfferingPrismaRepository.toDomain(row) : null;
  }

  async save(offering: ServiceOffering): Promise<void> {
    const data = {
      name: offering.name,
      description: offering.description,
      isEnabled: offering.isEnabled,
      sortOrder: offering.sortOrder,
      updatedAt: offering.updatedAt,
    };
    await this.prisma.serviceOffering.upsert({
      where: { id: offering.id },
      create: { id: offering.id, createdAt: offering.createdAt, ...data },
      update: data,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.serviceOffering.delete({ where: { id } });
  }

  private static toDomain(row: PrismaServiceOffering): ServiceOffering {
    return ServiceOffering.rehydrate(row.id, {
      name: row.name,
      description: row.description,
      isEnabled: row.isEnabled,
      sortOrder: row.sortOrder,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
