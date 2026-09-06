import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import { LoginEvent, LoginOutcome } from '../../domain/login-event.entity';
import { LOGIN_EVENT_REPOSITORY, LoginEventRepository } from '../../domain/login-event.repository';
import { DeviceContext } from '../dto/device-context';

/**
 * Writes login audit events. Shared by the login and two factor login use cases
 * so a success or failure is recorded in one place with the device that made the
 * attempt.
 */
@Injectable()
export class LoginEventRecorder {
  constructor(
    @Inject(LOGIN_EVENT_REPOSITORY) private readonly events: LoginEventRepository,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  record(userId: string, outcome: LoginOutcome, device: DeviceContext): Promise<void> {
    const event = LoginEvent.record({
      id: this.ids.generate(),
      userId,
      outcome,
      deviceLabel: device.deviceLabel,
      ipAddress: device.ipAddress,
      userAgent: device.userAgent,
      now: this.clock.now(),
    });
    return this.events.save(event);
  }
}
