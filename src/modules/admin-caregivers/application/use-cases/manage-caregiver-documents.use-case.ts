import { Inject, Injectable } from '@nestjs/common';
import { CaregiverDocument } from '@modules/caregiver-documents/domain/caregiver-document.entity';
import { CaregiverDocumentCategory } from '@modules/caregiver-documents/domain/caregiver-document-category.enum';
import { CaregiverDocumentStatus } from '@modules/caregiver-documents/domain/caregiver-document-status.enum';
import {
  CAREGIVER_DOCUMENT_REPOSITORY,
  CaregiverDocumentRepository,
} from '@modules/caregiver-documents/domain/caregiver-document.repository';
import { CaregiverTraining } from '@modules/caregiver-documents/domain/caregiver-training.entity';
import {
  CAREGIVER_TRAINING_REPOSITORY,
  CaregiverTrainingRepository,
} from '@modules/caregiver-documents/domain/caregiver-training.repository';
import { CaregiverProfile } from '@modules/caregiver-profile/domain/caregiver-profile.entity';
import {
  CAREGIVER_PROFILE_REPOSITORY,
  CaregiverProfileRepository,
} from '@modules/caregiver-profile/domain/caregiver-profile.repository';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';

/** File metadata carried by a capture; blob storage is deferred. */
interface DocumentFileInput {
  documentKey: string | null;
  fileName: string | null;
  uploadedBy: string | null;
}

async function requireProfile(
  profiles: CaregiverProfileRepository,
  profileId: string,
): Promise<CaregiverProfile> {
  const profile = await profiles.findById(profileId);
  if (profile === null || profile.isArchived) {
    throw new NotFoundDomainException('Caregiver not found');
  }
  return profile;
}

export interface AddCaregiverDocumentCommand {
  profileId: string;
  name: string;
  category: CaregiverDocumentCategory;
  status?: CaregiverDocumentStatus;
  documentDate: Date | null;
  file: DocumentFileInput;
}

/** Add an employment document to a caregiver. */
@Injectable()
export class AddCaregiverDocumentUseCase {
  constructor(
    @Inject(CAREGIVER_PROFILE_REPOSITORY) private readonly profiles: CaregiverProfileRepository,
    @Inject(CAREGIVER_DOCUMENT_REPOSITORY) private readonly documents: CaregiverDocumentRepository,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: AddCaregiverDocumentCommand): Promise<{ id: string }> {
    const profile = await requireProfile(this.profiles, command.profileId);
    const document = CaregiverDocument.record({
      id: this.ids.generate(),
      caregiverId: profile.userId,
      name: command.name,
      category: command.category,
      status: command.status,
      documentDate: command.documentDate,
      file: command.file,
      now: this.clock.now(),
    });
    await this.documents.save(document);
    return { id: document.id };
  }
}

export interface RecordCaregiverTrainingCommand {
  profileId: string;
  name: string;
  completedAt: Date | null;
  certificate: boolean;
  hoursCompleted: number;
  hoursRequired: number | null;
  file: DocumentFileInput;
}

/** Record a training course a caregiver has taken or is taking. */
@Injectable()
export class RecordCaregiverTrainingUseCase {
  constructor(
    @Inject(CAREGIVER_PROFILE_REPOSITORY) private readonly profiles: CaregiverProfileRepository,
    @Inject(CAREGIVER_TRAINING_REPOSITORY) private readonly trainings: CaregiverTrainingRepository,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: RecordCaregiverTrainingCommand): Promise<{ id: string }> {
    const profile = await requireProfile(this.profiles, command.profileId);
    const training = CaregiverTraining.record({
      id: this.ids.generate(),
      caregiverId: profile.userId,
      name: command.name,
      completedAt: command.completedAt,
      certificate: command.certificate,
      hoursCompleted: command.hoursCompleted,
      hoursRequired: command.hoursRequired,
      file: command.file,
      now: this.clock.now(),
    });
    await this.trainings.save(training);
    return { id: training.id };
  }
}
