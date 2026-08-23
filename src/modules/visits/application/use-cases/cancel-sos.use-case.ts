import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { SOS_ALERT_REPOSITORY, SosAlertRepository } from '../../domain/sos-alert.repository';
import { SosAlertResult, toSosAlertResult } from '../dto/sos-alert.result';

export interface CancelSosCommand {
  caregiverId: string;
  visitId: string;
  alertId: string;
}

/**
 * Use case: a caregiver cancels an SOS they raised (for example a false alarm).
 * The alert must exist and belong to the caregiver on that visit, so nobody can
 * cancel another caregiver's alert. Cancelling keeps the record for the audit;
 * it is idempotent, so cancelling an already cancelled alert is a no-op.
 */
@Injectable()
export class CancelSosUseCase {
  constructor(
    @Inject(SOS_ALERT_REPOSITORY) private readonly alerts: SosAlertRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: CancelSosCommand): Promise<SosAlertResult> {
    const alert = await this.alerts.findById(command.alertId);
    if (
      alert === null ||
      alert.caregiverId !== command.caregiverId ||
      alert.visitId !== command.visitId
    ) {
      throw new NotFoundDomainException('SOS alert not found');
    }

    alert.cancel(this.clock.now());
    await this.alerts.save(alert);

    return toSosAlertResult(alert);
  }
}
