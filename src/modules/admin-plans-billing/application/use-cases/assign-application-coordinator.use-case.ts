import { Inject, Injectable } from '@nestjs/common';
import {
  CLIENT_APPLICATION_REPOSITORY,
  ClientApplicationRepository,
} from '@modules/client-onboarding/domain/client-application.repository';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';

interface AssignApplicationCoordinatorCommand {
  applicationId: string;
  coordinatorId: string;
}

/**
 * Admin action: assign the coordinator who will own an onboarding case, advancing
 * the application to the Coordinator Assigned stage.
 */
@Injectable()
export class AssignApplicationCoordinatorUseCase {
  constructor(
    @Inject(CLIENT_APPLICATION_REPOSITORY)
    private readonly applications: ClientApplicationRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: AssignApplicationCoordinatorCommand): Promise<void> {
    const application = await this.applications.findById(command.applicationId);
    if (application === null) {
      throw new NotFoundDomainException('Onboarding application not found');
    }
    application.assignCoordinator(command.coordinatorId, this.clock.now());
    await this.applications.save(application);
  }
}
