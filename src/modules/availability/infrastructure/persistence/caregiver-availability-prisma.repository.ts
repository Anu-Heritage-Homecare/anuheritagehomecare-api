import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { CaregiverAvailability } from '../../domain/caregiver-availability.entity';
import { CaregiverAvailabilityRepository } from '../../domain/caregiver-availability.repository';
import { CaregiverAvailabilityMapper } from './caregiver-availability.mapper';

const AVAILABILITY_INCLUDE = { slots: true } as const;

/**
 * Prisma backed adapter for the CaregiverAvailabilityRepository port. The only
 * class in the module that talks to the database for availability. Saving
 * replaces the day's slots wholesale inside a transaction, since they belong to
 * the aggregate. Reads eager load the slots.
 */
@Injectable()
export class CaregiverAvailabilityPrismaRepository implements CaregiverAvailabilityRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByCaregiverAndDate(
    caregiverId: string,
    date: Date,
  ): Promise<CaregiverAvailability | null> {
    const row = await this.prisma.caregiverAvailability.findUnique({
      where: { caregiverId_date: { caregiverId, date } },
      include: AVAILABILITY_INCLUDE,
    });
    return row ? CaregiverAvailabilityMapper.toDomain(row) : null;
  }

  async listForCaregiverInRange(
    caregiverId: string,
    from: Date,
    to: Date,
  ): Promise<CaregiverAvailability[]> {
    const rows = await this.prisma.caregiverAvailability.findMany({
      where: { caregiverId, date: { gte: from, lte: to } },
      include: AVAILABILITY_INCLUDE,
      orderBy: { date: 'asc' },
    });
    return rows.map((row) => CaregiverAvailabilityMapper.toDomain(row));
  }

  async save(availability: CaregiverAvailability): Promise<void> {
    const row = CaregiverAvailabilityMapper.toPersistence(availability);
    const slots = CaregiverAvailabilityMapper.toSlotRows(availability);

    await this.prisma.$transaction([
      this.prisma.caregiverAvailability.upsert({
        where: { id: row.id },
        create: row,
        update: { updatedAt: row.updatedAt },
      }),
      this.prisma.caregiverAvailabilitySlot.deleteMany({ where: { availabilityId: row.id } }),
      this.prisma.caregiverAvailabilitySlot.createMany({
        data: slots.map((slot) => ({ ...slot, availabilityId: row.id })),
      }),
    ]);
  }
}
