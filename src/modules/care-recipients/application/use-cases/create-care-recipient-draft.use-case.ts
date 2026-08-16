import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import { CareRecipient } from '../../domain/care-recipient.entity';
import {
  CARE_RECIPIENT_REPOSITORY,
  CareRecipientRepository,
} from '../../domain/care-recipient.repository';
import { RecipientProfile } from '../../domain/value-objects/recipient-profile.vo';
import { CreateCareRecipientDraftCommand } from '../commands/create-care-recipient-draft.command';
import { CareRecipientResult, toCareRecipientResult } from '../dto/care-recipient.result';

/**
 * Use case: start a care recipient onboarding draft from the identity step. The
 * profile is validated through its value object, a draft aggregate is created
 * for the authenticated owner and persisted. Later steps enrich this draft.
 */
@Injectable()
export class CreateCareRecipientDraftUseCase {
  constructor(
    @Inject(CARE_RECIPIENT_REPOSITORY)
    private readonly repository: CareRecipientRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
  ) {}

  async execute(command: CreateCareRecipientDraftCommand): Promise<CareRecipientResult> {
    const profile = RecipientProfile.create({
      name: command.name,
      gender: command.gender,
      dateOfBirth: new Date(command.dateOfBirth),
      city: command.city,
      state: command.state,
      fullAddress: command.fullAddress,
      relationship: command.relationship,
      livingSituation: command.livingSituation,
      photoKey: command.photoKey,
      latitude: command.latitude,
      longitude: command.longitude,
    });

    const recipient = CareRecipient.startDraft({
      id: this.ids.generate(),
      ownerId: command.ownerId,
      profile,
      now: this.clock.now(),
    });

    await this.repository.save(recipient);
    recipient.clearDomainEvents();

    return toCareRecipientResult(recipient);
  }
}
