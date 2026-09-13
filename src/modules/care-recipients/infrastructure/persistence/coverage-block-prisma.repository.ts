import { Injectable } from '@nestjs/common';
import { CoverageSlot as PrismaSlot, Weekday as PrismaWeekday } from '@prisma/client';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { CoverageBlock } from '../../domain/coverage-block.entity';
import { CoverageBlockRepository } from '../../domain/coverage-block.repository';
import { CoverageSlot } from '../../domain/coverage-slot.enum';
import { Weekday } from '../../domain/weekday.enum';

const TO_DOMAIN_WEEKDAY: Record<PrismaWeekday, Weekday> = {
  MONDAY: Weekday.Monday,
  TUESDAY: Weekday.Tuesday,
  WEDNESDAY: Weekday.Wednesday,
  THURSDAY: Weekday.Thursday,
  FRIDAY: Weekday.Friday,
  SATURDAY: Weekday.Saturday,
  SUNDAY: Weekday.Sunday,
};

const TO_PERSISTENCE_WEEKDAY: Record<Weekday, PrismaWeekday> = {
  [Weekday.Monday]: 'MONDAY',
  [Weekday.Tuesday]: 'TUESDAY',
  [Weekday.Wednesday]: 'WEDNESDAY',
  [Weekday.Thursday]: 'THURSDAY',
  [Weekday.Friday]: 'FRIDAY',
  [Weekday.Saturday]: 'SATURDAY',
  [Weekday.Sunday]: 'SUNDAY',
};

const TO_DOMAIN_SLOT: Record<PrismaSlot, CoverageSlot> = {
  MORNING: CoverageSlot.Morning,
  AFTERNOON: CoverageSlot.Afternoon,
};

const TO_PERSISTENCE_SLOT: Record<CoverageSlot, PrismaSlot> = {
  [CoverageSlot.Morning]: 'MORNING',
  [CoverageSlot.Afternoon]: 'AFTERNOON',
};

/** Prisma backed adapter for the CoverageBlockRepository port. */
@Injectable()
export class CoverageBlockPrismaRepository implements CoverageBlockRepository {
  constructor(private readonly prisma: PrismaService) {}

  async replaceForRecipient(careRecipientId: string, blocks: CoverageBlock[]): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.coverageBlock.deleteMany({ where: { careRecipientId } }),
      this.prisma.coverageBlock.createMany({
        data: blocks.map((block) => ({
          id: block.id,
          careRecipientId: block.careRecipientId,
          weekday: TO_PERSISTENCE_WEEKDAY[block.weekday],
          slot: TO_PERSISTENCE_SLOT[block.slot],
          caregiverId: block.caregiverId,
        })),
      }),
    ]);
  }

  async listForRecipient(careRecipientId: string): Promise<CoverageBlock[]> {
    const rows = await this.prisma.coverageBlock.findMany({ where: { careRecipientId } });
    return rows.map((row) =>
      CoverageBlock.rehydrate(row.id, {
        careRecipientId: row.careRecipientId,
        weekday: TO_DOMAIN_WEEKDAY[row.weekday],
        slot: TO_DOMAIN_SLOT[row.slot],
        caregiverId: row.caregiverId,
      }),
    );
  }
}
