import { Injectable } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import {
  OPERATIONAL_ALERT_REPOSITORY,
  OperationalAlertRepository,
} from '@modules/admin-alerts/domain/operational-alert.repository';
import { RaiseAlertUseCase } from '@modules/admin-alerts/application/use-cases/raise-alert.use-case';
import { LiveSnapshot } from '../ports/live-monitoring-read.port';
import { detectConditions } from '../live-monitoring.util';

/**
 * Idempotently raises the operational alerts the day's visits call for: a late or
 * missed check-in, an overdue visit, or a failed location check. Dedupes by the
 * existing open alert for the same visit and type, so reading Live Monitoring
 * repeatedly does not pile up duplicates.
 */
@Injectable()
export class SweepLiveAlertsUseCase {
  constructor(
    @Inject(OPERATIONAL_ALERT_REPOSITORY) private readonly alerts: OperationalAlertRepository,
    private readonly raise: RaiseAlertUseCase,
  ) {}

  async execute(snapshot: LiveSnapshot, now: Date): Promise<void> {
    for (const condition of detectConditions(snapshot.visits, snapshot, now)) {
      const exists = await this.alerts.existsOpenForVisit(condition.type, condition.relatedVisitId);
      if (exists) {
        continue;
      }
      await this.raise.execute({
        type: condition.type,
        severity: condition.severity,
        title: condition.title,
        description: condition.description,
        relatedVisitId: condition.relatedVisitId,
        relatedCaregiverId: condition.relatedCaregiverId,
        relatedCareRecipientId: condition.relatedCareRecipientId,
      });
    }
  }
}
