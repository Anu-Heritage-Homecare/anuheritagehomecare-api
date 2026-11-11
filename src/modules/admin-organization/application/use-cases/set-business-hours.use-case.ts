import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { DayHours, Organization } from '../../domain/organization.entity';
import {
  ORGANIZATION_REPOSITORY,
  ORGANIZATION_SINGLETON_ID,
  OrganizationRepository,
} from '../../domain/organization.repository';
import { OrganizationResult, loadOrganizationResult } from '../dto/organization.result';

export interface SetBusinessHoursCommand {
  days: DayHours[];
}

/** Use case: replace the weekly opening schedule (the Edit Schedule action). */
@Injectable()
export class SetBusinessHoursUseCase {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY) private readonly repository: OrganizationRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: SetBusinessHoursCommand): Promise<OrganizationResult> {
    const now = this.clock.now();
    const organization =
      (await this.repository.getProfile()) ?? Organization.empty(ORGANIZATION_SINGLETON_ID, now);
    organization.setBusinessHours(command.days, now);
    await this.repository.saveProfile(organization);
    return loadOrganizationResult(this.repository, now);
  }
}
