import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { OrganizationEmergencyContact } from '../../domain/organization-emergency-contact.entity';
import {
  ORGANIZATION_REPOSITORY,
  OrganizationRepository,
} from '../../domain/organization.repository';
import { OrganizationResult, loadOrganizationResult } from '../dto/organization.result';

export interface AddEmergencyContactCommand {
  name: string;
  role?: string | null;
  phone: string;
}

export interface UpdateEmergencyContactCommand {
  contactId: string;
  name?: string;
  role?: string | null;
  phone?: string;
}

/** Use case: add an emergency contact (the Add action). */
@Injectable()
export class AddEmergencyContactUseCase {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY) private readonly repository: OrganizationRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
  ) {}

  async execute(command: AddEmergencyContactCommand): Promise<OrganizationResult> {
    const now = this.clock.now();
    const contact = OrganizationEmergencyContact.create({
      id: this.ids.generate(),
      name: command.name,
      role: command.role,
      phone: command.phone,
      now,
    });
    await this.repository.saveContact(contact);
    return loadOrganizationResult(this.repository, now);
  }
}

/** Use case: revise an emergency contact. */
@Injectable()
export class UpdateEmergencyContactUseCase {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY) private readonly repository: OrganizationRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: UpdateEmergencyContactCommand): Promise<OrganizationResult> {
    const now = this.clock.now();
    const contact = await this.repository.findContact(command.contactId);
    if (contact === null) {
      throw new NotFoundDomainException('Emergency contact not found');
    }
    const { contactId: _contactId, ...fields } = command;
    contact.edit(fields, now);
    await this.repository.saveContact(contact);
    return loadOrganizationResult(this.repository, now);
  }
}

/** Use case: remove an emergency contact. */
@Injectable()
export class DeleteEmergencyContactUseCase {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY) private readonly repository: OrganizationRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(contactId: string): Promise<OrganizationResult> {
    const contact = await this.repository.findContact(contactId);
    if (contact === null) {
      throw new NotFoundDomainException('Emergency contact not found');
    }
    await this.repository.deleteContact(contactId);
    return loadOrganizationResult(this.repository, this.clock.now());
  }
}
