import { Injectable } from '@nestjs/common';
import { CareTeamRole as PrismaRole } from '@prisma/client';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { CareTeamAssignment } from '../../domain/care-team-assignment.entity';
import { CareTeamAssignmentRepository } from '../../domain/care-team-assignment.repository';
import { CareTeamRole } from '../../domain/care-team-role.enum';

const TO_DOMAIN_ROLE: Record<PrismaRole, CareTeamRole> = {
  PRIMARY: CareTeamRole.Primary,
  BACKUP: CareTeamRole.Backup,
  COORDINATOR: CareTeamRole.Coordinator,
};

const TO_PERSISTENCE_ROLE: Record<CareTeamRole, PrismaRole> = {
  [CareTeamRole.Primary]: 'PRIMARY',
  [CareTeamRole.Backup]: 'BACKUP',
  [CareTeamRole.Coordinator]: 'COORDINATOR',
};

/** Prisma backed adapter for the CareTeamAssignmentRepository port. */
@Injectable()
export class CareTeamAssignmentPrismaRepository implements CareTeamAssignmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async add(assignment: CareTeamAssignment): Promise<void> {
    await this.prisma.careTeamAssignment.create({ data: this.toData(assignment) });
  }

  async save(assignment: CareTeamAssignment): Promise<void> {
    await this.prisma.careTeamAssignment.update({
      where: { id: assignment.id },
      data: {
        role: TO_PERSISTENCE_ROLE[assignment.role],
        specialization: assignment.specialization,
        scheduleLabel: assignment.scheduleLabel,
        removedAt: assignment.removedAt,
      },
    });
  }

  async findById(id: string): Promise<CareTeamAssignment | null> {
    const row = await this.prisma.careTeamAssignment.findUnique({ where: { id } });
    return row === null ? null : this.toDomain(row);
  }

  async listActiveForRecipient(careRecipientId: string): Promise<CareTeamAssignment[]> {
    const rows = await this.prisma.careTeamAssignment.findMany({
      where: { careRecipientId, removedAt: null },
      orderBy: { assignedAt: 'asc' },
    });
    return rows.map((row) => this.toDomain(row));
  }

  private toData(assignment: CareTeamAssignment): {
    id: string;
    careRecipientId: string;
    caregiverId: string;
    role: PrismaRole;
    specialization: string | null;
    scheduleLabel: string | null;
    assignedAt: Date;
    removedAt: Date | null;
  } {
    return {
      id: assignment.id,
      careRecipientId: assignment.careRecipientId,
      caregiverId: assignment.caregiverId,
      role: TO_PERSISTENCE_ROLE[assignment.role],
      specialization: assignment.specialization,
      scheduleLabel: assignment.scheduleLabel,
      assignedAt: assignment.assignedAt,
      removedAt: assignment.removedAt,
    };
  }

  private toDomain(row: {
    id: string;
    careRecipientId: string;
    caregiverId: string;
    role: PrismaRole;
    specialization: string | null;
    scheduleLabel: string | null;
    assignedAt: Date;
    removedAt: Date | null;
  }): CareTeamAssignment {
    return CareTeamAssignment.rehydrate(row.id, {
      careRecipientId: row.careRecipientId,
      caregiverId: row.caregiverId,
      role: TO_DOMAIN_ROLE[row.role],
      specialization: row.specialization,
      scheduleLabel: row.scheduleLabel,
      assignedAt: row.assignedAt,
      removedAt: row.removedAt,
    });
  }
}
