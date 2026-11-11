import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import {
  ORGANIZATION_REPOSITORY,
  OrganizationRepository,
} from '../../domain/organization.repository';
import { OrganizationResult, loadOrganizationResult } from '../dto/organization.result';

/** Use case: read the whole Organization Profile settings screen. */
@Injectable()
export class GetOrganizationUseCase {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY) private readonly repository: OrganizationRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  execute(): Promise<OrganizationResult> {
    return loadOrganizationResult(this.repository, this.clock.now());
  }
}
