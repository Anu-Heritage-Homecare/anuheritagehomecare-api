import {
  IncidentResolution as PrismaResolution,
  IncidentResolutionStatus as PrismaStatus,
} from '@prisma/client';
import { IncidentResolutionStatus } from '../../domain/incident-resolution-status.enum';
import { IncidentResolution } from '../../domain/incident-resolution.entity';

const TO_DOMAIN_STATUS: Record<PrismaStatus, IncidentResolutionStatus> = {
  PENDING_RESOLUTION: IncidentResolutionStatus.PendingResolution,
  RESOLVED: IncidentResolutionStatus.Resolved,
  ESCALATED: IncidentResolutionStatus.Escalated,
};

const TO_PERSISTENCE_STATUS: Record<IncidentResolutionStatus, PrismaStatus> = {
  [IncidentResolutionStatus.PendingResolution]: 'PENDING_RESOLUTION',
  [IncidentResolutionStatus.Resolved]: 'RESOLVED',
  [IncidentResolutionStatus.Escalated]: 'ESCALATED',
};

/** Translates the incident resolution row to and from the domain. */
export class IncidentResolutionMapper {
  static toDomain(row: PrismaResolution): IncidentResolution {
    return IncidentResolution.rehydrate(row.id, {
      incidentId: row.incidentId,
      status: TO_DOMAIN_STATUS[row.status],
      summary: row.summary,
      actionsTaken: row.actionsTaken,
      followUpRequired: row.followUpRequired,
      followUpDate: row.followUpDate,
      followUpNotes: row.followUpNotes,
      updatedByAdminId: row.updatedByAdminId,
    });
  }

  static statusToPersistence(status: IncidentResolutionStatus): PrismaStatus {
    return TO_PERSISTENCE_STATUS[status];
  }
}
