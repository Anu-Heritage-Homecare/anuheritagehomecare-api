import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import {
  CARE_RECIPIENT_REPOSITORY,
  CareRecipientRepository,
} from '../../domain/care-recipient.repository';
import { Medication } from '../../domain/medication.entity';
import { HealthInformation } from '../../domain/value-objects/health-information.vo';
import { UpdateHealthInformationCommand } from '../commands/update-health-information.command';
import { CareRecipientResult, toCareRecipientResult } from '../dto/care-recipient.result';
import { loadOwnedCareRecipient } from '../load-owned-care-recipient';

/** Use case: record health information and the medication schedule (third step). */
@Injectable()
export class UpdateHealthInformationUseCase {
  constructor(
    @Inject(CARE_RECIPIENT_REPOSITORY)
    private readonly repository: CareRecipientRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
  ) {}

  async execute(command: UpdateHealthInformationCommand): Promise<CareRecipientResult> {
    const health = HealthInformation.create({
      medicalConditions: command.medicalConditions,
      allergies: command.allergies,
      needsMedicationHelp: command.needsMedicationHelp,
    });

    const medications = (command.medications ?? []).map((medication) =>
      Medication.create({
        id: this.ids.generate(),
        name: medication.name,
        dose: medication.dose,
        scheduleMinute: medication.scheduleMinute,
      }),
    );

    const recipient = await loadOwnedCareRecipient(
      this.repository,
      command.careRecipientId,
      command.ownerId,
    );
    recipient.setHealthInformation(health, medications, this.clock.now());
    await this.repository.save(recipient);

    return toCareRecipientResult(recipient);
  }
}
