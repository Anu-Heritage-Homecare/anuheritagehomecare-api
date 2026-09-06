import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import {
  OPERATIONAL_ALERT_REPOSITORY,
  OperationalAlertRepository,
} from '../../domain/operational-alert.repository';
import { AlertResult, toAlertResult } from '../dto/alert.result';

/** How a coordinator closes an alert: actioned, or acknowledged as no action needed. */
export type AlertClosure = 'RESOLVE' | 'DISMISS';

export interface CloseAlertCommand {
  alertId: string;
  adminId: string;
  closure: AlertClosure;
}

/**
 * Use case: a coordinator closes an open alert, either resolving it (actioned) or
 * dismissing it (no action needed). Closing an already closed alert is a domain
 * error surfaced by the aggregate.
 */
@Injectable()
export class ResolveAlertUseCase {
  constructor(
    @Inject(OPERATIONAL_ALERT_REPOSITORY) private readonly alerts: OperationalAlertRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: CloseAlertCommand): Promise<AlertResult> {
    const alert = await this.alerts.findById(command.alertId);
    if (alert === null) {
      throw new NotFoundDomainException('Alert not found');
    }

    const now = this.clock.now();
    if (command.closure === 'DISMISS') {
      alert.dismiss(command.adminId, now);
    } else {
      alert.resolve(command.adminId, now);
    }

    await this.alerts.save(alert);
    return toAlertResult(alert);
  }
}
