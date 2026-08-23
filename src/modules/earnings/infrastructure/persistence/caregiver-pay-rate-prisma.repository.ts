import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { CaregiverPayRate } from '../../domain/caregiver-pay-rate.entity';
import { CaregiverPayRateRepository } from '../../domain/caregiver-pay-rate.repository';
import { CaregiverPayRateMapper } from './caregiver-pay-rate.mapper';

/** Prisma backed adapter for the CaregiverPayRateRepository port. */
@Injectable()
export class CaregiverPayRatePrismaRepository implements CaregiverPayRateRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByCaregiver(caregiverId: string): Promise<CaregiverPayRate | null> {
    const row = await this.prisma.caregiverPayRate.findUnique({ where: { caregiverId } });
    return row ? CaregiverPayRateMapper.toDomain(row) : null;
  }
}
