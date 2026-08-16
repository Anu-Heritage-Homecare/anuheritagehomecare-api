import {
  Visit as PrismaVisit,
  VisitStatus as PrismaVisitStatus,
  VisitTask as PrismaVisitTask,
} from '@prisma/client';
import { Visit } from '../../domain/visit.entity';
import { VisitStatus } from '../../domain/visit-status.enum';
import { VisitTask } from '../../domain/value-objects/visit-task.vo';
import { VisitWindow } from '../../domain/value-objects/visit-window.vo';

type VisitRow = PrismaVisit & { tasks: PrismaVisitTask[] };

/** Persisted shape of a single task, ready to write under its parent visit. */
export interface VisitTaskRow {
  label: string;
  completed: boolean;
  position: number;
}

/**
 * Translates between the Prisma visit row (with its task rows) and the Visit
 * aggregate. The only place that knows both shapes, so the domain stays free of
 * Prisma types. Tasks are ordered by their stored position.
 */
export class VisitMapper {
  static toDomain(row: VisitRow): Visit {
    const tasks = [...row.tasks]
      .sort((a, b) => a.position - b.position)
      .map((task) => VisitTask.create(task.label, task.completed));

    return Visit.rehydrate(row.id, {
      caregiverId: row.caregiverId,
      careRecipientId: row.careRecipientId,
      scheduledDate: row.scheduledDate,
      window: VisitWindow.create(row.startMinute, row.endMinute),
      status: VisitMapper.TO_DOMAIN_STATUS[row.status],
      tasks,
      specialInstructions: row.specialInstructions,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  static toPersistence(visit: Visit): PrismaVisit {
    return {
      id: visit.id,
      caregiverId: visit.caregiverId,
      careRecipientId: visit.careRecipientId,
      scheduledDate: visit.scheduledDate,
      startMinute: visit.window.startMinute,
      endMinute: visit.window.endMinute,
      status: VisitMapper.TO_PERSISTENCE_STATUS[visit.status],
      specialInstructions: visit.specialInstructions,
      createdAt: visit.createdAt,
      updatedAt: visit.updatedAt,
    };
  }

  static toTaskRows(visit: Visit): VisitTaskRow[] {
    return visit.tasks.map((task, index) => ({
      label: task.label,
      completed: task.completed,
      position: index,
    }));
  }

  private static readonly TO_DOMAIN_STATUS: Record<PrismaVisitStatus, VisitStatus> = {
    SCHEDULED: VisitStatus.Scheduled,
    IN_PROGRESS: VisitStatus.InProgress,
    COMPLETED: VisitStatus.Completed,
    CANCELLED: VisitStatus.Cancelled,
    MISSED: VisitStatus.Missed,
  };

  private static readonly TO_PERSISTENCE_STATUS: Record<VisitStatus, PrismaVisitStatus> = {
    [VisitStatus.Scheduled]: 'SCHEDULED',
    [VisitStatus.InProgress]: 'IN_PROGRESS',
    [VisitStatus.Completed]: 'COMPLETED',
    [VisitStatus.Cancelled]: 'CANCELLED',
    [VisitStatus.Missed]: 'MISSED',
  };
}
