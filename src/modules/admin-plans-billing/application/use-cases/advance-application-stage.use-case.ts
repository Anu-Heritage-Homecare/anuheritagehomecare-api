import { Inject, Injectable } from '@nestjs/common';
import {
  CLIENT_APPLICATION_REPOSITORY,
  ClientApplicationRepository,
} from '@modules/client-onboarding/domain/client-application.repository';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException, ValidationException } from '@shared/domain/domain-exception';

/** The plain forward transitions an admin can drive from the panel. */
export type AdvanceTransition =
  'RECORD_PAYMENT' | 'SUBMIT_REVIEW' | 'VERIFY_DOCS' | 'SCHEDULE_CAREGIVER';

export const ADVANCE_TRANSITIONS: AdvanceTransition[] = [
  'RECORD_PAYMENT',
  'SUBMIT_REVIEW',
  'VERIFY_DOCS',
  'SCHEDULE_CAREGIVER',
];

interface AdvanceApplicationStageCommand {
  applicationId: string;
  transition: AdvanceTransition;
  caregiverId: string | null;
}

/**
 * Admin action: advance an onboarding application through the plain forward
 * transitions of the funnel. Plan selection (needs a catalog price) and activation
 * (creates a subscription) are handled by their own flows and are out of scope here.
 */
@Injectable()
export class AdvanceApplicationStageUseCase {
  constructor(
    @Inject(CLIENT_APPLICATION_REPOSITORY)
    private readonly applications: ClientApplicationRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: AdvanceApplicationStageCommand): Promise<void> {
    const application = await this.applications.findById(command.applicationId);
    if (application === null) {
      throw new NotFoundDomainException('Onboarding application not found');
    }
    const now = this.clock.now();
    switch (command.transition) {
      case 'RECORD_PAYMENT':
        application.recordPayment(now);
        break;
      case 'SUBMIT_REVIEW':
        application.submitForReview(now);
        break;
      case 'VERIFY_DOCS':
        application.verifyDocuments(now);
        break;
      case 'SCHEDULE_CAREGIVER':
        if (command.caregiverId === null) {
          throw new ValidationException('A caregiver is required to schedule');
        }
        application.scheduleCaregiver(command.caregiverId, now);
        break;
    }
    await this.applications.save(application);
  }
}
