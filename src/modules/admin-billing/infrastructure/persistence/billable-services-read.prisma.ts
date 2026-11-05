import { Injectable } from '@nestjs/common';
import { Currency as PrismaCurrency } from '@prisma/client';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import {
  BillableServiceView,
  BillableServicesCatalogReadModel,
} from '../../application/ports/billable-services-read.port';

/** Prisma read model for the billable services catalog. */
@Injectable()
export class BillableServicesReadPrisma implements BillableServicesCatalogReadModel {
  constructor(private readonly prisma: PrismaService) {}

  async list(currency: PrismaCurrency): Promise<BillableServiceView[]> {
    const services = await this.prisma.billableService.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        unit: true,
        prices: { where: { currency }, select: { unitAmountMinor: true } },
      },
    });

    return services.map((service) => ({
      id: service.id,
      code: service.code,
      name: service.name,
      description: service.description,
      // The Prisma enum shares the view's string values.
      unit: service.unit,
      rateMinor: service.prices[0]?.unitAmountMinor ?? null,
    }));
  }
}
