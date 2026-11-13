import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { Currency } from '@shared/domain/currency.enum';
import { Organization } from '../../domain/organization.entity';
import {
  ORGANIZATION_REPOSITORY,
  ORGANIZATION_SINGLETON_ID,
  OrganizationRepository,
} from '../../domain/organization.repository';
import { OrganizationResult, loadOrganizationResult } from '../dto/organization.result';

export interface UpdateOrganizationProfileCommand {
  legalName?: string | null;
  businessRegNumber?: string | null;
  registeredAddress?: string | null;
  timezone?: string | null;
  systemLanguage?: string | null;
  currency?: Currency;
  dateFormat?: string | null;
}

/** Use case: revise the organization's profile details (the Edit Profile action). */
@Injectable()
export class UpdateOrganizationProfileUseCase {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY) private readonly repository: OrganizationRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: UpdateOrganizationProfileCommand): Promise<OrganizationResult> {
    const now = this.clock.now();
    const organization =
      (await this.repository.getProfile()) ?? Organization.empty(ORGANIZATION_SINGLETON_ID, now);
    organization.editProfile(command, now);
    await this.repository.saveProfile(organization);
    return loadOrganizationResult(this.repository, now);
  }
}
