import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { Visit } from '../../domain/visit.entity';
import { VisitRepository } from '../../domain/visit.repository';
import { VisitMapper } from './visit.mapper';

/**
 * Prisma backed adapter for the VisitRepository port. The only class in the
 * module that talks to the database for visits. Saving replaces the visit's
 * checklist wholesale inside a transaction, since tasks are owned by the visit
 * aggregate. Reads eager load the tasks and order visits chronologically.
 */
@Injectable()
export class VisitPrismaRepository implements VisitRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(visit: Visit): Promise<void> {
    const row = VisitMapper.toPersistence(visit);
    const tasks = VisitMapper.toTaskRows(visit);

    await this.prisma.$transaction([
      this.prisma.visit.upsert({
        where: { id: row.id },
        create: row,
        update: {
          caregiverId: row.caregiverId,
          careRecipientId: row.careRecipientId,
          scheduledDate: row.scheduledDate,
          startMinute: row.startMinute,
          endMinute: row.endMinute,
          status: row.status,
          specialInstructions: row.specialInstructions,
          updatedAt: row.updatedAt,
        },
      }),
      this.prisma.visitTask.deleteMany({ where: { visitId: row.id } }),
      this.prisma.visitTask.createMany({
        data: tasks.map((task) => ({ ...task, visitId: row.id })),
      }),
    ]);
  }

  async findById(id: string): Promise<Visit | null> {
    const row = await this.prisma.visit.findUnique({ where: { id }, include: { tasks: true } });
    return row ? VisitMapper.toDomain(row) : null;
  }

  async listForCaregiverInRange(caregiverId: string, from: Date, to: Date): Promise<Visit[]> {
    const rows = await this.prisma.visit.findMany({
      where: { caregiverId, scheduledDate: { gte: from, lte: to } },
      include: { tasks: true },
      orderBy: [{ scheduledDate: 'asc' }, { startMinute: 'asc' }],
    });
    return rows.map((row) => VisitMapper.toDomain(row));
  }
}
