import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { CareGoal } from '../../domain/care-goal.entity';
import { CareGoalRepository } from '../../domain/care-goal.repository';
import { CareGoalMapper } from './care-goal.mapper';

/** Prisma backed adapter for the CareGoalRepository port. */
@Injectable()
export class CareGoalPrismaRepository implements CareGoalRepository {
  constructor(private readonly prisma: PrismaService) {}

  async replaceForRecipient(careRecipientId: string, goals: CareGoal[]): Promise<void> {
    const rows = goals.map((goal) => CareGoalMapper.toPersistence(goal));
    await this.prisma.$transaction([
      this.prisma.careGoal.deleteMany({ where: { careRecipientId } }),
      this.prisma.careGoal.createMany({ data: rows }),
    ]);
  }

  async listForRecipient(careRecipientId: string): Promise<CareGoal[]> {
    const rows = await this.prisma.careGoal.findMany({
      where: { careRecipientId },
      orderBy: { position: 'asc' },
    });
    return rows.map((row) => CareGoalMapper.toDomain(row));
  }
}
