import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { CareCircleMember } from '../../domain/care-circle-member.entity';
import { CARE_CIRCLE_REPOSITORY, CareCircleRepository } from '../../domain/care-circle.repository';

export interface CareCircleMemberResult {
  id: string;
  name: string;
  relationship: string;
  phone: string | null;
  email: string | null;
}

export interface AddCareCircleMemberCommand {
  ownerId: string;
  name: string;
  relationship: string;
  phone?: string | null;
  email?: string | null;
}

/** Use case: list the owner's care circle, oldest first. */
@Injectable()
export class ListCareCircleUseCase {
  constructor(@Inject(CARE_CIRCLE_REPOSITORY) private readonly members: CareCircleRepository) {}

  async execute(query: { ownerId: string }): Promise<CareCircleMemberResult[]> {
    const members = await this.members.listForOwner(query.ownerId);
    return members.map(toResult);
  }
}

/** Use case: add a person to the owner's care circle. */
@Injectable()
export class AddCareCircleMemberUseCase {
  constructor(
    @Inject(CARE_CIRCLE_REPOSITORY) private readonly members: CareCircleRepository,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: AddCareCircleMemberCommand): Promise<CareCircleMemberResult> {
    const member = CareCircleMember.create({
      id: this.ids.generate(),
      ownerId: command.ownerId,
      name: command.name,
      relationship: command.relationship,
      phone: command.phone ?? null,
      email: command.email ?? null,
      createdAt: this.clock.now(),
    });
    await this.members.save(member);
    return toResult(member);
  }
}

/** Use case: remove a person from the owner's care circle. Owner scoped. */
@Injectable()
export class RemoveCareCircleMemberUseCase {
  constructor(@Inject(CARE_CIRCLE_REPOSITORY) private readonly members: CareCircleRepository) {}

  async execute(command: { ownerId: string; memberId: string }): Promise<void> {
    const member = await this.members.findById(command.memberId);
    if (member === null || member.ownerId !== command.ownerId) {
      throw new NotFoundDomainException('Care circle member not found');
    }
    await this.members.delete(command.ownerId, command.memberId);
  }
}

function toResult(member: CareCircleMember): CareCircleMemberResult {
  return {
    id: member.id,
    name: member.name,
    relationship: member.relationship,
    phone: member.phone,
    email: member.email,
  };
}
