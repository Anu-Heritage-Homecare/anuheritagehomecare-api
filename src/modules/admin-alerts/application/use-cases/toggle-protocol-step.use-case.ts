import { Inject, Injectable } from '@nestjs/common';
import {
  SOS_ALERT_REPOSITORY,
  SosAlertRepository,
} from '@modules/visits/domain/sos-alert.repository';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { EmergencyProtocolStep } from '../../domain/emergency-protocol-step.enum';
import {
  EMERGENCY_RESPONSE_REPOSITORY,
  EmergencyResponseRepository,
} from '../../domain/emergency-response.repository';
import { SosProtocolCompletion } from '../../domain/sos-protocol-completion.entity';

export interface ToggleProtocolStepCommand {
  sosAlertId: string;
  step: EmergencyProtocolStep;
  completed: boolean;
  adminId: string;
}

/** Tick or un-tick one emergency response protocol step for an SOS alert. */
@Injectable()
export class ToggleProtocolStepUseCase {
  constructor(
    @Inject(SOS_ALERT_REPOSITORY) private readonly sos: SosAlertRepository,
    @Inject(EMERGENCY_RESPONSE_REPOSITORY) private readonly response: EmergencyResponseRepository,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: ToggleProtocolStepCommand): Promise<void> {
    const alert = await this.sos.findById(command.sosAlertId);
    if (alert === null) {
      throw new NotFoundDomainException('Emergency not found');
    }
    if (command.completed) {
      await this.response.saveCompletion(
        SosProtocolCompletion.complete({
          id: this.ids.generate(),
          sosAlertId: command.sosAlertId,
          step: command.step,
          adminId: command.adminId,
          now: this.clock.now(),
        }),
      );
    } else {
      await this.response.removeCompletion(command.sosAlertId, command.step);
    }
  }
}
