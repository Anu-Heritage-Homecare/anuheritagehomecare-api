import { Inject, Injectable } from '@nestjs/common';
import {
  CaregiverProfileFields,
  EmergencyContact,
} from '@modules/caregiver-profile/domain/caregiver-profile.entity';
import {
  CAREGIVER_PROFILE_REPOSITORY,
  CaregiverProfileRepository,
} from '@modules/caregiver-profile/domain/caregiver-profile.repository';
import { CaregiverStatus } from '@modules/caregiver-profile/domain/caregiver-status.enum';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';

export type EditCaregiverCommand = { profileId: string } & (
  | { section: 'PROFILE'; fields: CaregiverProfileFields }
  | { section: 'SKILLS'; skills: string[] }
  | { section: 'LANGUAGES'; languages: string[] }
  | { section: 'EMERGENCY'; contact: EmergencyContact }
  | { section: 'STATUS'; status: CaregiverStatus }
  | { section: 'PREFERENCES'; preferencesNote: string | null }
);

/** Edit one section of a caregiver profile. */
@Injectable()
export class EditCaregiverUseCase {
  constructor(
    @Inject(CAREGIVER_PROFILE_REPOSITORY) private readonly profiles: CaregiverProfileRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: EditCaregiverCommand): Promise<void> {
    const profile = await this.profiles.findById(command.profileId);
    if (profile === null) {
      throw new NotFoundDomainException('Caregiver not found');
    }
    const now = this.clock.now();

    switch (command.section) {
      case 'PROFILE':
        profile.reviseProfile(command.fields, now);
        break;
      case 'SKILLS':
        profile.setSkills(command.skills, now);
        break;
      case 'LANGUAGES':
        profile.setLanguages(command.languages, now);
        break;
      case 'EMERGENCY':
        profile.setEmergencyContact(command.contact, now);
        break;
      case 'STATUS':
        profile.setStatus(command.status, now);
        break;
      case 'PREFERENCES':
        profile.setPreferencesNote(command.preferencesNote, now);
        break;
    }

    await this.profiles.save(profile);
  }
}

/** Soft archive a caregiver profile so it drops out of the directory. */
@Injectable()
export class DeleteCaregiverUseCase {
  constructor(
    @Inject(CAREGIVER_PROFILE_REPOSITORY) private readonly profiles: CaregiverProfileRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(profileId: string): Promise<void> {
    const profile = await this.profiles.findById(profileId);
    if (profile === null) {
      throw new NotFoundDomainException('Caregiver not found');
    }
    profile.archive(this.clock.now());
    await this.profiles.save(profile);
  }
}

interface AddCaregiverNoteCommand {
  profileId: string;
  adminId: string;
  body: string;
  authorName: string | null;
}

/** Add a note to a caregiver profile. */
@Injectable()
export class AddCaregiverNoteUseCase {
  constructor(
    @Inject(CAREGIVER_PROFILE_REPOSITORY) private readonly profiles: CaregiverProfileRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: AddCaregiverNoteCommand): Promise<void> {
    const profile = await this.profiles.findById(command.profileId);
    if (profile === null) {
      throw new NotFoundDomainException('Caregiver not found');
    }
    profile.addNote(command.body, command.adminId, command.authorName, this.clock.now());
    await this.profiles.save(profile);
  }
}
