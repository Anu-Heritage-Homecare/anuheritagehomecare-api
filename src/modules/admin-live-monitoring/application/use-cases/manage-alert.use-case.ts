import { Inject, Injectable } from '@nestjs/common';
import {
  OPERATIONAL_ALERT_REPOSITORY,
  OperationalAlertRepository,
} from '@modules/admin-alerts/domain/operational-alert.repository';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';

/** Acknowledge an operational alert (dismiss it as seen) from Live Monitoring. */
@Injectable()
export class AcknowledgeAlertUseCase {
  constructor(
    @Inject(OPERATIONAL_ALERT_REPOSITORY) private readonly alerts: OperationalAlertRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(alertId: string, adminId: string): Promise<void> {
    const alert = await this.alerts.findById(alertId);
    if (alert === null) {
      throw new NotFoundDomainException('Alert not found');
    }
    alert.dismiss(adminId, this.clock.now());
    await this.alerts.save(alert);
  }
}

/** Resolve an operational alert (the problem has been actioned) from Live Monitoring. */
@Injectable()
export class ResolveAlertUseCase {
  constructor(
    @Inject(OPERATIONAL_ALERT_REPOSITORY) private readonly alerts: OperationalAlertRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(alertId: string, adminId: string): Promise<void> {
    const alert = await this.alerts.findById(alertId);
    if (alert === null) {
      throw new NotFoundDomainException('Alert not found');
    }
    alert.resolve(adminId, this.clock.now());
    await this.alerts.save(alert);
  }
}
