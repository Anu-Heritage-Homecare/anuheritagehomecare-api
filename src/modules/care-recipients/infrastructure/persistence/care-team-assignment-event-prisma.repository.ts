import { Injectable } from '@nestjs/common';
import { CareTeamAction as PrismaAction } from '@prisma/client';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { CareTeamAction } from '../../domain/care-team-action.enum';
import { CareTeamAssignmentEvent } from '../../domain/care-team-assignment-event.entity';
import { CareTeamAssignmentEventRepository } from '../../domain/care-team-assignment-event.repository';

const TO_DOMAIN_ACTION: Record<PrismaAction, CareTeamAction> = {
  ASSIGNED: CareTeamAction.Assigned,
  REMOVED: CareTeamAction.Removed,
};

const TO_PERSISTENCE_ACTION: Record<CareTeamAction, PrismaAction> = {
  [CareTeamAction.Assigned]: 'ASSIGNED',
  [CareTeamAction.Removed]: 'REMOVED',
};

/** Prisma backed adapter for the CareTeamAssignmentEventRepository port (append only). */
@Injectable()
export class CareTeamAssignmentEventPrismaRepository implements CareTeamAssignmentEventRepository {
  constructor(private readonly prisma: PrismaService) {}

  async add(event: CareTeamAssignmentEvent): Promise<void> {
    await this.prisma.careTeamAssignmentEvent.create({
      data: {
        id: event.id,
        careRecipientId: event.careRecipientId,
        caregiverId: event.caregiverId,
        action: TO_PERSISTENCE_ACTION[event.action],
        reason: event.reason,
        byAdminId: event.byAdminId,
        createdAt: event.createdAt,
      },
    });
  }

  async listForRecipient(
    careRecipientId: string,
    limit: number,
  ): Promise<CareTeamAssignmentEvent[]> {
    const rows = await this.prisma.careTeamAssignmentEvent.findMany({
      where: { careRecipientId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return rows.map((row) =>
      CareTeamAssignmentEvent.rehydrate(row.id, {
        careRecipientId: row.careRecipientId,
        caregiverId: row.caregiverId,
        action: TO_DOMAIN_ACTION[row.action],
        reason: row.reason,
        byAdminId: row.byAdminId,
        createdAt: row.createdAt,
      }),
    );
  }
}
