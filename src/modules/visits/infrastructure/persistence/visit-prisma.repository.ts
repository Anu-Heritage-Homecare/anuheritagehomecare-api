import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { Visit } from '../../domain/visit.entity';
import { VisitRepository } from '../../domain/visit.repository';
import { VisitMapper } from './visit.mapper';

/** Eager load every collection the Visit aggregate owns. */
const VISIT_INCLUDE = {
  tasks: true,
  medicationAdministrations: true,
  vitals: true,
  breaks: true,
  notes: true,
} as const;

/**
 * Prisma backed adapter for the VisitRepository port. The only class in the
 * module that talks to the database for visits. Saving replaces the visit's
 * owned collections (checklist, medication administrations, vitals) wholesale
 * inside a transaction, since they belong to the aggregate. Reads eager load
 * those collections and order visits chronologically.
 */
@Injectable()
export class VisitPrismaRepository implements VisitRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(visit: Visit): Promise<void> {
    const row = VisitMapper.toPersistence(visit);
    const tasks = VisitMapper.toTaskRows(visit);
    const administrations = VisitMapper.toAdministrationRows(visit);
    const vitals = VisitMapper.toVitalsRows(visit);
    const breaks = VisitMapper.toBreakRows(visit);
    const notes = VisitMapper.toNoteRows(visit);

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
          photoKeys: row.photoKeys,
          clockInAt: row.clockInAt,
          clockOutAt: row.clockOutAt,
          arrivalLatitude: row.arrivalLatitude,
          arrivalLongitude: row.arrivalLongitude,
          updatedAt: row.updatedAt,
        },
      }),
      this.prisma.visitTask.deleteMany({ where: { visitId: row.id } }),
      this.prisma.visitTask.createMany({
        data: tasks.map((task) => ({ ...task, visitId: row.id })),
      }),
      this.prisma.medicationAdministration.deleteMany({ where: { visitId: row.id } }),
      this.prisma.medicationAdministration.createMany({
        data: administrations.map((administration) => ({ ...administration, visitId: row.id })),
      }),
      this.prisma.visitVitals.deleteMany({ where: { visitId: row.id } }),
      this.prisma.visitVitals.createMany({
        data: vitals.map((reading) => ({ ...reading, visitId: row.id })),
      }),
      this.prisma.visitBreak.deleteMany({ where: { visitId: row.id } }),
      this.prisma.visitBreak.createMany({
        data: breaks.map((entry) => ({ ...entry, visitId: row.id })),
      }),
      this.prisma.visitNote.deleteMany({ where: { visitId: row.id } }),
      this.prisma.visitNote.createMany({
        data: notes.map((note) => ({ ...note, visitId: row.id })),
      }),
    ]);
  }

  async findById(id: string): Promise<Visit | null> {
    const row = await this.prisma.visit.findUnique({ where: { id }, include: VISIT_INCLUDE });
    return row ? VisitMapper.toDomain(row) : null;
  }

  async listForCaregiverInRange(caregiverId: string, from: Date, to: Date): Promise<Visit[]> {
    const rows = await this.prisma.visit.findMany({
      where: { caregiverId, scheduledDate: { gte: from, lte: to } },
      include: VISIT_INCLUDE,
      orderBy: [{ scheduledDate: 'asc' }, { startMinute: 'asc' }],
    });
    return rows.map((row) => VisitMapper.toDomain(row));
  }

  async listForCareRecipientsInRange(
    careRecipientIds: string[],
    from: Date,
    to: Date,
  ): Promise<Visit[]> {
    if (careRecipientIds.length === 0) {
      return [];
    }
    const rows = await this.prisma.visit.findMany({
      where: { careRecipientId: { in: careRecipientIds }, scheduledDate: { gte: from, lte: to } },
      include: VISIT_INCLUDE,
      orderBy: [{ scheduledDate: 'asc' }, { startMinute: 'asc' }],
    });
    return rows.map((row) => VisitMapper.toDomain(row));
  }
}
