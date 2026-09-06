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
      resolvedAt: row.resolvedAt,
      resolvedByAdminId: row.resolvedByAdminId,
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
      resolvedAt: alert.resolvedAt,
      resolvedByAdminId: alert.resolvedByAdminId,
    };
  }

  private static readonly TO_DOMAIN_TYPE: Record<PrismaAlertType, AlertType> = {
    LATE_CAREGIVER: AlertType.LateCaregiver,
    MISSED_CLOCK_IN: AlertType.MissedClockIn,
    CERTIFICATION_EXPIRING: AlertType.CertificationExpiring,
    MEDICATION_ISSUE: AlertType.MedicationIssue,
    GENERAL: AlertType.General,
  };

  private static readonly TO_PERSISTENCE_TYPE: Record<AlertType, PrismaAlertType> = {
    [AlertType.LateCaregiver]: 'LATE_CAREGIVER',
    [AlertType.MissedClockIn]: 'MISSED_CLOCK_IN',
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
    RESOLVED: AlertStatus.Resolved,
    DISMISSED: AlertStatus.Dismissed,
  };

  private static readonly TO_PERSISTENCE_STATUS: Record<AlertStatus, PrismaAlertStatus> = {
    [AlertStatus.Open]: 'OPEN',
    [AlertStatus.Resolved]: 'RESOLVED',
    [AlertStatus.Dismissed]: 'DISMISSED',
  };
}
