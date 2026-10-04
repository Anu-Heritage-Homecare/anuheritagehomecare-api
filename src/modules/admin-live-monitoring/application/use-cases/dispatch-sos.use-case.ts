import { Inject, Injectable } from '@nestjs/common';
import {
  SOS_ALERT_REPOSITORY,
  SosAlertRepository,
} from '@modules/visits/domain/sos-alert.repository';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';

/**
 * Emergency Dispatch: an admin records that an emergency response has been
 * dispatched for an active SOS alert from Live Monitoring. The alert stays active
 * until the situation is resolved.
 */
@Injectable()
export class DispatchSosUseCase {
  constructor(
    @Inject(SOS_ALERT_REPOSITORY) private readonly alerts: SosAlertRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(sosAlertId: string): Promise<{ dispatchedAt: Date }> {
    const alert = await this.alerts.findById(sosAlertId);
    if (alert === null) {
      throw new NotFoundDomainException('SOS alert not found');
    }
    const now = this.clock.now();
    alert.dispatch(now);
    await this.alerts.save(alert);
    return { dispatchedAt: now };
  }
}
