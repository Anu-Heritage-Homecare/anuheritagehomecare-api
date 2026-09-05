import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { EmergencyContact } from '../../domain/emergency-contact.entity';
import {
  EMERGENCY_CONTACT_REPOSITORY,
  EmergencyContactRepository,
} from '../../domain/emergency-contact.repository';

export interface EmergencyContactResult {
  name: string;
  phone: string;
  relationship: string;
}

export interface SetEmergencyContactCommand {
  userId: string;
  name: string;
  phone: string;
  relationship: string;
}

/** Use case: read the owner's emergency contact, or null when none is set. */
@Injectable()
export class GetEmergencyContactUseCase {
  constructor(
    @Inject(EMERGENCY_CONTACT_REPOSITORY) private readonly contacts: EmergencyContactRepository,
  ) {}

  async execute(query: { userId: string }): Promise<EmergencyContactResult | null> {
    const contact = await this.contacts.findByUser(query.userId);
    return contact === null ? null : toResult(contact);
  }
}

/** Use case: set (replace) the owner's emergency contact. */
@Injectable()
export class SetEmergencyContactUseCase {
  constructor(
    @Inject(EMERGENCY_CONTACT_REPOSITORY) private readonly contacts: EmergencyContactRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: SetEmergencyContactCommand): Promise<EmergencyContactResult> {
    const contact = EmergencyContact.create({
      userId: command.userId,
      name: command.name,
      phone: command.phone,
      relationship: command.relationship,
      now: this.clock.now(),
    });
    await this.contacts.save(contact);
    return toResult(contact);
  }
}

function toResult(contact: EmergencyContact): EmergencyContactResult {
  return { name: contact.name, phone: contact.phone, relationship: contact.relationship };
}
