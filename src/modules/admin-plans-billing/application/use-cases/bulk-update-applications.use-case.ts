import { Inject, Injectable } from '@nestjs/common';
import {
  CLIENT_APPLICATION_REPOSITORY,
  ClientApplicationRepository,
} from '@modules/client-onboarding/domain/client-application.repository';
import { OnboardingStatus } from '@modules/client-onboarding/domain/onboarding-status.enum';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';

export type BulkApplicationAction = 'APPROVE' | 'REJECT';

export const BULK_APPLICATION_ACTIONS: BulkApplicationAction[] = ['APPROVE', 'REJECT'];

interface BulkUpdateApplicationsCommand {
  ids: string[];
  action: BulkApplicationAction;
}

export interface BulkUpdateApplicationsResult {
  updated: number;
  notFound: string[];
}

const STATUS_FOR: Record<BulkApplicationAction, OnboardingStatus> = {
  APPROVE: OnboardingStatus.Approved,
  REJECT: OnboardingStatus.Rejected,
};

/**
 * Admin bulk action: approve or reject a selection of onboarding applications. Each
 * application's verification status is set; ids that do not resolve are reported
 * back rather than failing the whole batch.
 */
@Injectable()
export class BulkUpdateApplicationsUseCase {
  constructor(
    @Inject(CLIENT_APPLICATION_REPOSITORY)
    private readonly applications: ClientApplicationRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: BulkUpdateApplicationsCommand): Promise<BulkUpdateApplicationsResult> {
    const status = STATUS_FOR[command.action];
    const now = this.clock.now();
    const uniqueIds = [...new Set(command.ids)];
    const notFound: string[] = [];
    let updated = 0;

    for (const id of uniqueIds) {
      const application = await this.applications.findById(id);
      if (application === null) {
        notFound.push(id);
        continue;
      }
      application.setStatus(status, now);
      await this.applications.save(application);
      updated += 1;
    }

    return { updated, notFound };
  }
}
