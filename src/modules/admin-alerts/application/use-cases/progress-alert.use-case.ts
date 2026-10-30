import { Inject, Injectable } from '@nestjs/common';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import {
  OPERATIONAL_ALERT_REPOSITORY,
  OperationalAlertRepository,
} from '../../domain/operational-alert.repository';
import { AlertResult, toAlertResult } from '../dto/alert.result';

/** Moving an active alert along its lifecycle without closing it. */
export type AlertProgress = 'ACKNOWLEDGE' | 'INVESTIGATE';

export interface ProgressAlertCommand {
  alertId: string;
  progress: AlertProgress;
}

/**
 * Use case: a coordinator acknowledges an alert (seen) or marks it as being
 * investigated (worked). The aggregate enforces the valid transitions.
 */
@Injectable()
export class ProgressAlertUseCase {
  constructor(
    @Inject(OPERATIONAL_ALERT_REPOSITORY) private readonly alerts: OperationalAlertRepository,
  ) {}

  async execute(command: ProgressAlertCommand): Promise<AlertResult> {
    const alert = await this.alerts.findById(command.alertId);
    if (alert === null) {
      throw new NotFoundDomainException('Alert not found');
    }
    if (command.progress === 'ACKNOWLEDGE') {
      alert.acknowledge();
    } else {
      alert.investigate();
    }
    await this.alerts.save(alert);
    return toAlertResult(alert);
  }
}
