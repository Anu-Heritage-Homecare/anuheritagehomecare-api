import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { CarePlanScheduleBlock } from '../../domain/care-plan-schedule-block.entity';
import { CarePlanScheduleRepository } from '../../domain/care-plan-schedule-block.repository';

/** Prisma backed adapter for the CarePlanScheduleRepository port. */
@Injectable()
export class CarePlanSchedulePrismaRepository implements CarePlanScheduleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async replaceForRecipient(
    careRecipientId: string,
    blocks: CarePlanScheduleBlock[],
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.carePlanScheduleBlock.deleteMany({ where: { careRecipientId } }),
      this.prisma.carePlanScheduleBlock.createMany({
        data: blocks.map((block) => ({
          id: block.id,
          careRecipientId: block.careRecipientId,
          startMinute: block.startMinute,
          title: block.title,
          description: block.description,
          position: block.position,
        })),
      }),
    ]);
  }

  async listForRecipient(careRecipientId: string): Promise<CarePlanScheduleBlock[]> {
    const rows = await this.prisma.carePlanScheduleBlock.findMany({
      where: { careRecipientId },
      orderBy: { position: 'asc' },
    });
    return rows.map((row) =>
      CarePlanScheduleBlock.rehydrate(row.id, {
        careRecipientId: row.careRecipientId,
        startMinute: row.startMinute,
        title: row.title,
        description: row.description,
        position: row.position,
      }),
    );
  }
}
