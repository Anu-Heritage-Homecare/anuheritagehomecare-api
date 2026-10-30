import {
  AlertSeverity as PrismaAlertSeverity,
  Incident as PrismaIncident,
  IncidentCategory as PrismaIncidentCategory,
  IncidentStatus as PrismaIncidentStatus,
} from '@prisma/client';
import { AlertSeverity } from '../../domain/alert-severity.enum';
import { IncidentCategory } from '../../domain/incident-category.enum';
import { IncidentStatus } from '../../domain/incident-status.enum';
import { Incident } from '../../domain/incident.entity';

/**
 * Translates between the Prisma Incident row and the aggregate. The only place
 * that knows both shapes, so the domain stays free of Prisma types.
 */
export class IncidentMapper {
  static toDomain(row: PrismaIncident): Incident {
    return Incident.rehydrate(row.id, {
      sequence: row.sequence,
      category: IncidentMapper.TO_DOMAIN_CATEGORY[row.category],
      severity: IncidentMapper.TO_DOMAIN_SEVERITY[row.severity],
      status: IncidentMapper.TO_DOMAIN_STATUS[row.status],
      detail: row.detail,
      reporterName: row.reporterName,
      reportedByAdminId: row.reportedByAdminId,
      assignedCoordinatorAdminId: row.assignedCoordinatorAdminId,
      relatedVisitId: row.relatedVisitId,
      relatedCaregiverId: row.relatedCaregiverId,
      relatedCareRecipientId: row.relatedCareRecipientId,
      createdAt: row.createdAt,
      resolvedAt: row.resolvedAt,
      resolvedByAdminId: row.resolvedByAdminId,
    });
  }

  static toCreateInput(incident: Incident): Omit<PrismaIncident, 'sequence'> {
    return {
      id: incident.id,
      category: IncidentMapper.TO_PERSISTENCE_CATEGORY[incident.category],
      severity: IncidentMapper.TO_PERSISTENCE_SEVERITY[incident.severity],
      status: IncidentMapper.TO_PERSISTENCE_STATUS[incident.status],
      detail: incident.detail,
      reporterName: incident.reporterName,
      reportedByAdminId: incident.reportedByAdminId,
      assignedCoordinatorAdminId: incident.assignedCoordinatorAdminId,
      relatedVisitId: incident.relatedVisitId,
      relatedCaregiverId: incident.relatedCaregiverId,
      relatedCareRecipientId: incident.relatedCareRecipientId,
      createdAt: incident.createdAt,
      resolvedAt: incident.resolvedAt,
      resolvedByAdminId: incident.resolvedByAdminId,
    };
  }

  private static readonly TO_DOMAIN_CATEGORY: Record<PrismaIncidentCategory, IncidentCategory> = {
    MEDICATION_CONCERN: IncidentCategory.MedicationConcern,
    RECIPIENT_FALL: IncidentCategory.RecipientFall,
    SERVICE_COMPLAINT: IncidentCategory.ServiceComplaint,
    BEHAVIOURAL: IncidentCategory.Behavioural,
    OTHER: IncidentCategory.Other,
  };

  private static readonly TO_PERSISTENCE_CATEGORY: Record<
    IncidentCategory,
    PrismaIncidentCategory
  > = {
    [IncidentCategory.MedicationConcern]: 'MEDICATION_CONCERN',
    [IncidentCategory.RecipientFall]: 'RECIPIENT_FALL',
    [IncidentCategory.ServiceComplaint]: 'SERVICE_COMPLAINT',
    [IncidentCategory.Behavioural]: 'BEHAVIOURAL',
    [IncidentCategory.Other]: 'OTHER',
  };

  private static readonly TO_DOMAIN_SEVERITY: Record<PrismaAlertSeverity, AlertSeverity> = {
    LOW: AlertSeverity.Low,
    MEDIUM: AlertSeverity.Medium,
    HIGH: AlertSeverity.High,
    CRITICAL: AlertSeverity.Critical,
  };

  private static readonly TO_PERSISTENCE_SEVERITY: Record<AlertSeverity, PrismaAlertSeverity> = {
    [AlertSeverity.Low]: 'LOW',
    [AlertSeverity.Medium]: 'MEDIUM',
    [AlertSeverity.High]: 'HIGH',
    [AlertSeverity.Critical]: 'CRITICAL',
  };

  private static readonly TO_DOMAIN_STATUS: Record<PrismaIncidentStatus, IncidentStatus> = {
    OPEN: IncidentStatus.Open,
    UNDER_REVIEW: IncidentStatus.UnderReview,
    RESOLVED: IncidentStatus.Resolved,
    CLOSED: IncidentStatus.Closed,
  };

  private static readonly TO_PERSISTENCE_STATUS: Record<IncidentStatus, PrismaIncidentStatus> = {
    [IncidentStatus.Open]: 'OPEN',
    [IncidentStatus.UnderReview]: 'UNDER_REVIEW',
    [IncidentStatus.Resolved]: 'RESOLVED',
    [IncidentStatus.Closed]: 'CLOSED',
  };
}
