import { CaregiverGender } from '@modules/caregiver-profile/domain/caregiver-gender.enum';
import { CaregiverProfile } from '@modules/caregiver-profile/domain/caregiver-profile.entity';
import { CaregiverProfileRepository } from '@modules/caregiver-profile/domain/caregiver-profile.repository';
import { CaregiverPayRate } from '@modules/earnings/domain/caregiver-pay-rate.entity';
import { CaregiverPayRateRepository } from '@modules/earnings/domain/caregiver-pay-rate.repository';
import { UserType } from '@modules/identity/domain/user-type.enum';
import { User } from '@modules/identity/domain/user.entity';
import { UserRepository } from '@modules/identity/domain/user.repository';
import { buildUser } from '@modules/identity/test-support/user-builder';
import { Currency } from '@shared/domain/currency.enum';
import { ConflictDomainException, NotFoundDomainException } from '@shared/domain/domain-exception';
import { EditCaregiverPersonalInfoUseCase } from './edit-caregiver-personal-info.use-case';
import { SetCaregiverHourlyRateUseCase } from './set-caregiver-hourly-rate.use-case';

const NOW = new Date('2026-09-20T10:00:00.000Z');
const clock = { now: () => NOW };
const ids = { generate: () => 'rate-new' };

function profileRepo(profile: CaregiverProfile | null): CaregiverProfileRepository & {
  saved: CaregiverProfile[];
} {
  const saved: CaregiverProfile[] = [];
  return {
    saved,
    save: (p) => {
      saved.push(p);
      return Promise.resolve();
    },
    findById: () => Promise.resolve(profile),
    findByUserId: () => Promise.resolve(null),
  };
}

function userRepo(user: User | null, emailTaken = false): UserRepository & { saved: User[] } {
  const saved: User[] = [];
  return {
    saved,
    save: (u) => {
      saved.push(u);
      return Promise.resolve();
    },
    findById: () => Promise.resolve(user),
    findByIds: () => Promise.resolve([]),
    findByEmail: () => Promise.resolve(null),
    existsByEmail: () => Promise.resolve(emailTaken),
    existsByPhone: () => Promise.resolve(false),
    countByType: () => Promise.resolve(0),
  };
}

function profile(): CaregiverProfile {
  return CaregiverProfile.create({ id: 'cg-1', userId: 'user-1', now: NOW });
}

describe('EditCaregiverPersonalInfoUseCase', () => {
  const command = {
    profileId: 'cg-1',
    firstName: 'Sarah',
    lastName: 'Williams',
    phone: '+2348031111111',
    email: null,
    dateOfBirth: new Date('1988-06-15T00:00:00.000Z'),
    gender: CaregiverGender.Female,
    addressLine1: '234 Maple Drive',
    city: 'Springfield',
    state: 'IL',
    postalCode: '62701',
  };

  it('writes name and address through to the account and gender to the overlay', async () => {
    const users = userRepo(
      buildUser({ id: 'user-1', userType: UserType.Caregiver, verified: true }),
    );
    const profiles = profileRepo(profile());
    await new EditCaregiverPersonalInfoUseCase(profiles, users, clock).execute(command);
    expect(users.saved[0].name.firstName).toBe('Sarah');
    expect(users.saved[0].address.city).toBe('Springfield');
    expect(users.saved[0].address.country).toBe('NG');
    expect(profiles.saved[0].gender).toBe(CaregiverGender.Female);
  });

  it('changes the email when a new unique one is supplied', async () => {
    const users = userRepo(
      buildUser({ id: 'user-1', userType: UserType.Caregiver, verified: true }),
    );
    await new EditCaregiverPersonalInfoUseCase(profileRepo(profile()), users, clock).execute({
      ...command,
      email: 'sarah.new@careprofs.com',
    });
    expect(users.saved[0].email.value).toBe('sarah.new@careprofs.com');
  });

  it('rejects an email already in use', async () => {
    const users = userRepo(
      buildUser({ id: 'user-1', userType: UserType.Caregiver, verified: true }),
      true,
    );
    await expect(
      new EditCaregiverPersonalInfoUseCase(profileRepo(profile()), users, clock).execute({
        ...command,
        email: 'taken@careprofs.com',
      }),
    ).rejects.toBeInstanceOf(ConflictDomainException);
  });

  it('rejects an unknown caregiver', async () => {
    await expect(
      new EditCaregiverPersonalInfoUseCase(profileRepo(null), userRepo(null), clock).execute(
        command,
      ),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});

function payRateRepo(existing: CaregiverPayRate | null): CaregiverPayRateRepository & {
  saved: CaregiverPayRate[];
} {
  const saved: CaregiverPayRate[] = [];
  return {
    saved,
    findByCaregiver: () => Promise.resolve(existing),
    save: (rate) => {
      saved.push(rate);
      return Promise.resolve();
    },
  };
}

describe('SetCaregiverHourlyRateUseCase', () => {
  it('creates a pay rate in the caregiver currency when none exists', async () => {
    const users = userRepo(
      buildUser({ id: 'user-1', userType: UserType.Caregiver, verified: true }),
    );
    const rates = payRateRepo(null);
    await new SetCaregiverHourlyRateUseCase(profileRepo(profile()), users, rates, ids).execute({
      profileId: 'cg-1',
      hourlyRateMinor: 2850,
    });
    expect(rates.saved[0].hourlyRateMinor).toBe(2850);
    expect(rates.saved[0].currency).toBe(Currency.NigerianNaira);
  });

  it('updates the hourly rate of an existing pay rate', async () => {
    const users = userRepo(
      buildUser({ id: 'user-1', userType: UserType.Caregiver, verified: true }),
    );
    const existing = CaregiverPayRate.create({
      id: 'rate-1',
      caregiverId: 'user-1',
      currency: Currency.NigerianNaira,
      hourlyRateMinor: 2000,
      overtimeMultiplierBps: 15_000,
      regularHoursCap: 80,
      weekendBonusMinor: 0,
      taxRateBps: 0,
    });
    const rates = payRateRepo(existing);
    await new SetCaregiverHourlyRateUseCase(profileRepo(profile()), users, rates, ids).execute({
      profileId: 'cg-1',
      hourlyRateMinor: 3100,
    });
    expect(rates.saved[0].hourlyRateMinor).toBe(3100);
  });
});
