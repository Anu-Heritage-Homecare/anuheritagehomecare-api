import {
  AlertSeverity as PrismaAlertSeverity,
  AlertStatus as PrismaAlertStatus,
  AlertType as PrismaAlertType,
  OperationalAlert as PrismaOperationalAlert,
} from '@prisma/client';
import { AlertSeverity } from '../../domain/alert-severity.enum';
import { AlertStatus } from '../../domain/alert-status.enum';
import { AlertType } from '../../domain/alert-type.enum';
import { OperationalAlert } from '../../domain/operational-alert.entity';

/**
 * Translates between the Prisma OperationalAlert row and the aggregate. The only
 * place that knows both shapes, so the domain stays free of Prisma types.
 */
export class OperationalAlertMapper {
  static toDomain(row: PrismaOperationalAlert): OperationalAlert {
    return OperationalAlert.rehydrate(row.id, {
      type: OperationalAlertMapper.TO_DOMAIN_TYPE[row.type],
      severity: OperationalAlertMapper.TO_DOMAIN_SEVERITY[row.severity],
      title: row.title,
      description: row.description,
      coordinatorName: row.coordinatorName,
      status: OperationalAlertMapper.TO_DOMAIN_STATUS[row.status],
      relatedVisitId: row.relatedVisitId,
      relatedCaregiverId: row.relatedCaregiverId,
      relatedCareRecipientId: row.relatedCareRecipientId,
      createdAt: row.createdAt,
      acknowledgedAt: row.acknowledgedAt,
      acknowledgedByAdminId: row.acknowledgedByAdminId,
      acknowledgeNote: row.acknowledgeNote,
      escalatedAt: row.escalatedAt,
      escalatedByAdminId: row.escalatedByAdminId,
      escalationLevel: row.escalationLevel,
      escalationAssignee: row.escalationAssignee,
      escalationReason: row.escalationReason,
      escalationNote: row.escalationNote,
      resolvedAt: row.resolvedAt,
      resolvedByAdminId: row.resolvedByAdminId,
      resolutionCategory: row.resolutionCategory,
      resolutionActionTaken: row.resolutionActionTaken,
      resolutionInternalNote: row.resolutionInternalNote,
    });
  }

  static toPersistence(alert: OperationalAlert): PrismaOperationalAlert {
    return {
      id: alert.id,
      type: OperationalAlertMapper.TO_PERSISTENCE_TYPE[alert.type],
      severity: OperationalAlertMapper.TO_PERSISTENCE_SEVERITY[alert.severity],
      title: alert.title,
      description: alert.description,
      coordinatorName: alert.coordinatorName,
      status: OperationalAlertMapper.TO_PERSISTENCE_STATUS[alert.status],
      relatedVisitId: alert.relatedVisitId,
      relatedCaregiverId: alert.relatedCaregiverId,
      relatedCareRecipientId: alert.relatedCareRecipientId,
      createdAt: alert.createdAt,
      acknowledgedAt: alert.acknowledgedAt,
      acknowledgedByAdminId: alert.acknowledgedByAdminId,
      acknowledgeNote: alert.acknowledgeNote,
      escalatedAt: alert.escalatedAt,
      escalatedByAdminId: alert.escalatedByAdminId,
      escalationLevel: alert.escalationLevel,
      escalationAssignee: alert.escalationAssignee,
      escalationReason: alert.escalationReason,
      escalationNote: alert.escalationNote,
      resolvedAt: alert.resolvedAt,
      resolvedByAdminId: alert.resolvedByAdminId,
      resolutionCategory: alert.resolutionCategory,
      resolutionActionTaken: alert.resolutionActionTaken,
      resolutionInternalNote: alert.resolutionInternalNote,
    };
  }

  private static readonly TO_DOMAIN_TYPE: Record<PrismaAlertType, AlertType> = {
    LATE_CAREGIVER: AlertType.LateCaregiver,
    MISSED_CLOCK_IN: AlertType.MissedClockIn,
    VISIT_OVERDUE: AlertType.VisitOverdue,
    LOCATION_VERIFICATION_FAILED: AlertType.LocationVerificationFailed,
    CERTIFICATION_EXPIRING: AlertType.CertificationExpiring,
    MEDICATION_ISSUE: AlertType.MedicationIssue,
    GENERAL: AlertType.General,
  };

  private static readonly TO_PERSISTENCE_TYPE: Record<AlertType, PrismaAlertType> = {
    [AlertType.LateCaregiver]: 'LATE_CAREGIVER',
    [AlertType.MissedClockIn]: 'MISSED_CLOCK_IN',
    [AlertType.VisitOverdue]: 'VISIT_OVERDUE',
    [AlertType.LocationVerificationFailed]: 'LOCATION_VERIFICATION_FAILED',
    [AlertType.CertificationExpiring]: 'CERTIFICATION_EXPIRING',
    [AlertType.MedicationIssue]: 'MEDICATION_ISSUE',
    [AlertType.General]: 'GENERAL',
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

  private static readonly TO_DOMAIN_STATUS: Record<PrismaAlertStatus, AlertStatus> = {
    OPEN: AlertStatus.Open,
    ACKNOWLEDGED: AlertStatus.Acknowledged,
    INVESTIGATING: AlertStatus.Investigating,
    RESOLVED: AlertStatus.Resolved,
    DISMISSED: AlertStatus.Dismissed,
  };

  private static readonly TO_PERSISTENCE_STATUS: Record<AlertStatus, PrismaAlertStatus> = {
    [AlertStatus.Open]: 'OPEN',
    [AlertStatus.Acknowledged]: 'ACKNOWLEDGED',
    [AlertStatus.Investigating]: 'INVESTIGATING',
    [AlertStatus.Resolved]: 'RESOLVED',
    [AlertStatus.Dismissed]: 'DISMISSED',
  };
}
