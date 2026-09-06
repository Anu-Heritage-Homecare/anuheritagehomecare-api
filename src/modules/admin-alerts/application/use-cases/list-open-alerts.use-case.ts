import { Inject, Injectable } from '@nestjs/common';
import { ALERT_SEVERITY_RANK } from '../../domain/alert-severity.enum';
import {
  OPERATIONAL_ALERT_REPOSITORY,
  OperationalAlertRepository,
} from '../../domain/operational-alert.repository';
import { AlertResult, toAlertResult } from '../dto/alert.result';

/** The most open alerts the dashboard shows at once. */
const OPEN_ALERTS_LIMIT = 50;

/**
 * Use case: list the open operational alerts, most severe first and, within a
 * severity, most recent first. Backs the dashboard Critical Alerts section and the
 * alerts screen.
 */
@Injectable()
export class ListOpenAlertsUseCase {
  constructor(
    @Inject(OPERATIONAL_ALERT_REPOSITORY) private readonly alerts: OperationalAlertRepository,
  ) {}

  async execute(): Promise<AlertResult[]> {
    const open = await this.alerts.listOpen(OPEN_ALERTS_LIMIT);
    return open
      .sort((a, b) => {
        const bySeverity = ALERT_SEVERITY_RANK[b.severity] - ALERT_SEVERITY_RANK[a.severity];
        return bySeverity !== 0 ? bySeverity : b.createdAt.getTime() - a.createdAt.getTime();
      })
      .map(toAlertResult);
  }
}
