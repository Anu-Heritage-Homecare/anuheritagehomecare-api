import { CaregiverEmploymentType } from '@modules/caregiver-profile/domain/caregiver-employment-type.enum';
import { CaregiverGender } from '@modules/caregiver-profile/domain/caregiver-gender.enum';
import { CaregiverProfile } from '@modules/caregiver-profile/domain/caregiver-profile.entity';
import { CaregiverProfileRepository } from '@modules/caregiver-profile/domain/caregiver-profile.repository';
import { AccountRegistrar } from '@modules/identity/application/services/account-registrar.service';
import { OtpService } from '@modules/identity/application/services/otp.service';
import { InMemoryFamilyDirectoryEntryRepository } from '@modules/identity/test-support/doubles';
import { PasswordHasher } from '@modules/identity/application/ports/password-hasher.port';
import { UserStatus } from '@modules/identity/domain/user-status.enum';
import { UserType } from '@modules/identity/domain/user-type.enum';
import { User } from '@modules/identity/domain/user.entity';
import { UserRepository } from '@modules/identity/domain/user.repository';
import { Clock } from '@shared/application/ports/clock.port';
import { IdGenerator } from '@shared/application/ports/id-generator.port';
import {
  AccountAlreadyExistsException,
  ConflictDomainException,
} from '@shared/domain/domain-exception';
import { ProvisionCaregiverUseCase } from './provision-caregiver.use-case';

const NOW = new Date('2026-10-01T09:00:00.000Z');
const clock: Clock = { now: () => NOW };

function sequentialIds(): IdGenerator {
  let n = 0;
  return { generate: () => `id-${++n}` };
}

const hasher: PasswordHasher = {
  hash: (raw: string) => Promise.resolve(`hashed:${raw}`),
  compare: () => Promise.resolve(true),
};

const otp = { issueAndSend: () => Promise.resolve() } as unknown as OtpService;

function userRepo(options: { emailTaken?: boolean; phoneTaken?: boolean } = {}): UserRepository & {
  saved: User[];
} {
  const saved: User[] = [];
  return {
    saved,
    save: (u) => {
      saved.push(u);
      return Promise.resolve();
    },
    findById: () => Promise.resolve(null),
    findByIds: () => Promise.resolve([]),
    findByEmail: () => Promise.resolve(null),
    existsByEmail: () => Promise.resolve(options.emailTaken ?? false),
    existsByPhone: () => Promise.resolve(options.phoneTaken ?? false),
    countByType: () => Promise.resolve(0),
  };
}

function profileRepo(): CaregiverProfileRepository & { saved: CaregiverProfile[] } {
  const saved: CaregiverProfile[] = [];
  return {
    saved,
    save: (p) => {
      saved.push(p);
      return Promise.resolve();
    },
    findById: () => Promise.resolve(null),
    findByUserId: () => Promise.resolve(null),
  };
}

const command = {
  firstName: 'Sarah',
  lastName: 'Williams',
  email: 'sarah.williams@careprofs.com',
  phone: '+2348031111111',
  addressLine1: '234 Maple Drive',
  addressLine2: null,
  city: 'Lagos',
  state: 'LA',
  postalCode: '100001',
  country: 'NG',
  dateOfBirth: new Date('1990-05-14'),
  profile: {
    title: 'Senior Caregiver',
    gender: CaregiverGender.Female,
    employmentType: CaregiverEmploymentType.FullTime,
    experienceYears: 6,
    skills: ['Dementia care', 'Medication'],
    languages: ['English', 'Yoruba'],
    emergencyContactName: 'John Williams',
    emergencyContactPhone: '+2348032222222',
    emergencyContactRelationship: 'Spouse',
    emergencyContactEmail: 'john.williams@example.com',
    preferencesNote: 'Prefers morning shifts',
  },
};

function build(repos: {
  users: UserRepository & { saved: User[] };
  profiles: CaregiverProfileRepository & { saved: CaregiverProfile[] };
}): ProvisionCaregiverUseCase {
  const registrar = new AccountRegistrar(
    repos.users,
    hasher,
    clock,
    sequentialIds(),
    new InMemoryFamilyDirectoryEntryRepository(),
    otp,
  );
  return new ProvisionCaregiverUseCase(registrar, repos.profiles, clock, sequentialIds());
}

describe('ProvisionCaregiverUseCase', () => {
  it('creates a login ready, must change password caregiver account and overlay', async () => {
    const users = userRepo();
    const profiles = profileRepo();
    const result = await build({ users, profiles }).execute(command);

    expect(result.userId).toBeTruthy();
    expect(result.profileId).toBeTruthy();

    const user = users.saved[0];
    expect(user.userType).toBe(UserType.Caregiver);
    expect(user.mustChangePassword).toBe(true);
    expect(user.canLogIn).toBe(true); // already verified and active, no OTP step
    expect(user.status).toBe(UserStatus.Active);

    expect(user.dateOfBirth).toEqual(new Date('1990-05-14'));

    const profile = profiles.saved[0];
    expect(profile.userId).toBe(user.id);
    expect(profile.title).toBe('Senior Caregiver');
    expect(profile.gender).toBe(CaregiverGender.Female);
    expect(profile.skills).toEqual(['Dementia care', 'Medication']);
    expect(profile.languages).toEqual(['English', 'Yoruba']);
    expect(profile.emergencyContact.name).toBe('John Williams');
    expect(profile.emergencyContact.phone).toBe('+2348032222222');
    expect(profile.preferencesNote).toBe('Prefers morning shifts');
  });

  it('returns a one time temporary password that satisfies the password policy', async () => {
    const users = userRepo();
    const result = await build({ users, profiles: profileRepo() }).execute(command);

    expect(result.temporaryPassword).toMatch(/[a-z]/);
    expect(result.temporaryPassword).toMatch(/[A-Z]/);
    expect(result.temporaryPassword).toMatch(/\d/);
    expect(result.temporaryPassword.length).toBeGreaterThanOrEqual(8);
    // Stored only as a hash of the issued password, never in plaintext.
    expect(users.saved[0].passwordHash).toBe(`hashed:${result.temporaryPassword}`);
  });

  it('rejects a duplicate email', async () => {
    const users = userRepo({ emailTaken: true });
    await expect(build({ users, profiles: profileRepo() }).execute(command)).rejects.toBeInstanceOf(
      AccountAlreadyExistsException,
    );
    expect(users.saved).toHaveLength(0);
  });

  it('rejects a duplicate phone', async () => {
    const users = userRepo({ phoneTaken: true });
    await expect(build({ users, profiles: profileRepo() }).execute(command)).rejects.toBeInstanceOf(
      ConflictDomainException,
    );
  });
});
