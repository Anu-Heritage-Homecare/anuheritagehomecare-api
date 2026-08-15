import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { CarePlan } from '../../domain/care-plan.entity';
import { CarePlanRepository } from '../../domain/care-plan.repository';
import { CarePlanType } from '../../domain/care-plan-type.enum';
import { CarePlanMapper } from './care-plan.mapper';

/** Prisma backed adapter for the CarePlanRepository read port. */
@Injectable()
export class CarePlanPrismaRepository implements CarePlanRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByType(type: CarePlanType): Promise<CarePlan | null> {
    const row = await this.prisma.carePlan.findUnique({
      where: { type: CarePlanMapper.toPrismaType(type) },
      include: { prices: true },
    });
    return row ? CarePlanMapper.toDomain(row) : null;
  }

  async findAllActive(): Promise<CarePlan[]> {
    const rows = await this.prisma.carePlan.findMany({
      where: { active: true },
      include: { prices: true },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((row) => CarePlanMapper.toDomain(row));
  }
}
