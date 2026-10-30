import { Inject, Injectable } from '@nestjs/common';
import {
  SOS_ALERT_REPOSITORY,
  SosAlertRepository,
} from '@modules/visits/domain/sos-alert.repository';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';

export interface AcknowledgeEmergencyCommand {
  sosAlertId: string;
  adminId: string;
  assignedTo: string | null;
}

/** Acknowledge an SOS emergency and assign the response to a responder. */
@Injectable()
export class AcknowledgeEmergencyUseCase {
  constructor(
    @Inject(SOS_ALERT_REPOSITORY) private readonly sos: SosAlertRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: AcknowledgeEmergencyCommand): Promise<void> {
    const alert = await this.sos.findById(command.sosAlertId);
    if (alert === null) {
      throw new NotFoundDomainException('Emergency not found');
    }
    alert.acknowledgeAndAssign(command.adminId, command.assignedTo, this.clock.now());
    await this.sos.save(alert);
  }
}
