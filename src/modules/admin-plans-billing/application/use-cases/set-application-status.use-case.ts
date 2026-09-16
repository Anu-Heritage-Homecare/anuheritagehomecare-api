import { Inject, Injectable } from '@nestjs/common';
import {
  CLIENT_APPLICATION_REPOSITORY,
  ClientApplicationRepository,
} from '@modules/client-onboarding/domain/client-application.repository';
import { OnboardingStatus } from '@modules/client-onboarding/domain/onboarding-status.enum';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException, ValidationException } from '@shared/domain/domain-exception';

interface SetApplicationStatusCommand {
  applicationId: string;
  status: string;
}

/**
 * Admin action: set the verification status of an onboarding application (approve,
 * under review, needs info, rejected) without moving its funnel stage. Backs the
 * Approve Requests command action and the queue status controls.
 */
@Injectable()
export class SetApplicationStatusUseCase {
  constructor(
    @Inject(CLIENT_APPLICATION_REPOSITORY)
    private readonly applications: ClientApplicationRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: SetApplicationStatusCommand): Promise<void> {
    const status = Object.values(OnboardingStatus).find(
      (value) => String(value) === command.status,
    );
    if (status === undefined) {
      throw new ValidationException('Unknown onboarding status');
    }
    const application = await this.applications.findById(command.applicationId);
    if (application === null) {
      throw new NotFoundDomainException('Onboarding application not found');
    }
    application.setStatus(status, this.clock.now());
    await this.applications.save(application);
  }
}
