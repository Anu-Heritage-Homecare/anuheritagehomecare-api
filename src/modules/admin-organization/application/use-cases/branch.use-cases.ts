import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import { NotFoundDomainException, ValidationException } from '@shared/domain/domain-exception';
import { BranchStatus } from '../../domain/branch-status.enum';
import { DayHours } from '../../domain/organization.entity';
import { OrganizationBranch } from '../../domain/organization-branch.entity';
import {
  ORGANIZATION_REPOSITORY,
  OrganizationRepository,
} from '../../domain/organization.repository';
import { OrganizationResult, loadOrganizationResult } from '../dto/organization.result';

export interface AddBranchCommand {
  name: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  phone?: string | null;
  managerId?: string | null;
  status?: BranchStatus;
  businessHours?: DayHours[];
}

export interface UpdateBranchCommand {
  branchId: string;
  name?: string;
  addressLine1?: string;
  addressLine2?: string | null;
  city?: string;
  state?: string;
  phone?: string | null;
  managerId?: string | null;
  status?: BranchStatus;
  businessHours?: DayHours[];
}

/** Guard that a branch manager assignment points at a real admin user. */
async function assertManagerExists(
  repository: OrganizationRepository,
  managerId: string | null | undefined,
): Promise<void> {
  if (managerId && !(await repository.managerExists(managerId))) {
    throw new ValidationException('The selected branch manager does not exist');
  }
}

/** Use case: add a branch (the Add Branch action). */
@Injectable()
export class AddBranchUseCase {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY) private readonly repository: OrganizationRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
  ) {}

  async execute(command: AddBranchCommand): Promise<OrganizationResult> {
    const now = this.clock.now();
    await assertManagerExists(this.repository, command.managerId);
    const branch = OrganizationBranch.create({
      id: this.ids.generate(),
      name: command.name,
      addressLine1: command.addressLine1,
      addressLine2: command.addressLine2,
      city: command.city,
      state: command.state,
      phone: command.phone,
      managerId: command.managerId,
      status: command.status,
      businessHours: command.businessHours,
      now,
    });
    await this.repository.saveBranch(branch);
    return loadOrganizationResult(this.repository, now);
  }
}

/** Use case: revise a branch (rename, re-address, reassign manager, activate or deactivate). */
@Injectable()
export class UpdateBranchUseCase {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY) private readonly repository: OrganizationRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: UpdateBranchCommand): Promise<OrganizationResult> {
    const now = this.clock.now();
    const branch = await this.repository.findBranch(command.branchId);
    if (branch === null) {
      throw new NotFoundDomainException('Branch not found');
    }
    await assertManagerExists(this.repository, command.managerId);
    const { branchId: _branchId, ...fields } = command;
    branch.edit(fields, now);
    await this.repository.saveBranch(branch);
    return loadOrganizationResult(this.repository, now);
  }
}

/** Use case: remove a branch. */
@Injectable()
export class DeleteBranchUseCase {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY) private readonly repository: OrganizationRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(branchId: string): Promise<OrganizationResult> {
    const branch = await this.repository.findBranch(branchId);
    if (branch === null) {
      throw new NotFoundDomainException('Branch not found');
    }
    await this.repository.deleteBranch(branchId);
    return loadOrganizationResult(this.repository, this.clock.now());
  }
}
