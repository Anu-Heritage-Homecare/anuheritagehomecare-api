import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import {
  CARE_RECIPIENT_REPOSITORY,
  CareRecipientRepository,
} from '../../domain/care-recipient.repository';
import { HealthInformation } from '../../domain/value-objects/health-information.vo';
import { UpdateHealthInformationCommand } from '../commands/update-health-information.command';
import { CareRecipientResult, toCareRecipientResult } from '../dto/care-recipient.result';
import { loadOwnedCareRecipient } from '../load-owned-care-recipient';

/** Use case: record health and medication information (third onboarding step). */
@Injectable()
export class UpdateHealthInformationUseCase {
  constructor(
    @Inject(CARE_RECIPIENT_REPOSITORY)
    private readonly repository: CareRecipientRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: UpdateHealthInformationCommand): Promise<CareRecipientResult> {
    const health = HealthInformation.create({
      medicalConditions: command.medicalConditions,
      allergies: command.allergies,
      needsMedicationHelp: command.needsMedicationHelp,
      medications: command.medications,
    });

    const recipient = await loadOwnedCareRecipient(
      this.repository,
      command.careRecipientId,
      command.ownerId,
    );
    recipient.setHealthInformation(health, this.clock.now());
    await this.repository.save(recipient);

    return toCareRecipientResult(recipient);
  }
}
