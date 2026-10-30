import { Inject, Injectable } from '@nestjs/common';
import {
  SOS_ALERT_REPOSITORY,
  SosAlertRepository,
} from '@modules/visits/domain/sos-alert.repository';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';

export interface ResolveEmergencyCommand {
  sosAlertId: string;
  adminId: string;
}

/** The office resolves (closes out) an SOS emergency. */
@Injectable()
export class ResolveEmergencyUseCase {
  constructor(
    @Inject(SOS_ALERT_REPOSITORY) private readonly sos: SosAlertRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: ResolveEmergencyCommand): Promise<void> {
    const alert = await this.sos.findById(command.sosAlertId);
    if (alert === null) {
      throw new NotFoundDomainException('Emergency not found');
    }
    alert.resolve(command.adminId, this.clock.now());
    await this.sos.save(alert);
  }
}
