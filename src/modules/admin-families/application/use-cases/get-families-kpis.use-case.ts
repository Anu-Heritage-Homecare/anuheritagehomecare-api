import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import {
  FAMILY_DIRECTORY_READ_MODEL,
  FamilyDirectoryReadModel,
} from '../ports/family-directory-read.port';
import { FamilyKpisResult } from '../dto/family-directory.result';

/**
 * The Families KPI bar: total families, new this month, primary contacts, families
 * with active care, outstanding payments and pending requests. Unread messages is
 * deferred until a messaging context exists. Read only.
 */
@Injectable()
export class GetFamiliesKpisUseCase {
  constructor(
    @Inject(FAMILY_DIRECTORY_READ_MODEL) private readonly reads: FamilyDirectoryReadModel,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(): Promise<FamilyKpisResult> {
    return this.reads.kpis(this.clock.now());
  }
}
