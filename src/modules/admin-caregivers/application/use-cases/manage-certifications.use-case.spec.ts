import { CaregiverProfile } from '@modules/caregiver-profile/domain/caregiver-profile.entity';
import { CaregiverProfileRepository } from '@modules/caregiver-profile/domain/caregiver-profile.repository';
import { Certification } from '@modules/certifications/domain/certification.entity';
import { CertificationRepository } from '@modules/certifications/domain/certification.repository';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import {
  AddCertificationUseCase,
  EditCertificationUseCase,
  RemoveCertificationUseCase,
} from './manage-certifications.use-case';

const NOW = new Date('2026-09-20T10:00:00.000Z');
const clock = { now: () => NOW };
const ids = { generate: () => 'cert-new' };

function profileRepo(profile: CaregiverProfile | null): CaregiverProfileRepository {
  return {
    save: () => Promise.resolve(),
    findById: () => Promise.resolve(profile),
    findByUserId: () => Promise.resolve(null),
  };
}

function certRepo(found: Certification | null): CertificationRepository & {
  saved: Certification[];
  deleted: string[];
} {
  const saved: Certification[] = [];
  const deleted: string[] = [];
  return {
    saved,
    deleted,
    save: (c) => {
      saved.push(c);
      return Promise.resolve();
    },
    findById: () => Promise.resolve(found),
    delete: (id) => {
      deleted.push(id);
      return Promise.resolve();
    },
    listExpiringBefore: () => Promise.resolve([]),
    listForCaregiver: () => Promise.resolve([]),
  };
}

function profile(): CaregiverProfile {
  return CaregiverProfile.create({ id: 'cg-1', userId: 'user-1', now: NOW });
}

function certification(): Certification {
  return Certification.record({
    id: 'cert-1',
    caregiverId: 'user-1',
    name: 'CNA License',
    expiresAt: new Date('2026-12-31T00:00:00.000Z'),
    now: NOW,
  });
}

describe('AddCertificationUseCase', () => {
  it('records a certification against the caregiver user', async () => {
    const store = certRepo(null);
    const result = await new AddCertificationUseCase(
      profileRepo(profile()),
      store,
      ids,
      clock,
    ).execute({
      profileId: 'cg-1',
      name: 'CPR/First Aid',
      licenseNumber: 'CPR-2026-156',
      issuedAt: null,
      expiresAt: new Date('2027-03-01T00:00:00.000Z'),
    });
    expect(result.id).toBe('cert-new');
    expect(store.saved[0].caregiverId).toBe('user-1');
    expect(store.saved[0].name).toBe('CPR/First Aid');
  });

  it('rejects an unknown caregiver', async () => {
    await expect(
      new AddCertificationUseCase(profileRepo(null), certRepo(null), ids, clock).execute({
        profileId: 'nope',
        name: 'CPR',
        licenseNumber: null,
        issuedAt: null,
        expiresAt: NOW,
      }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});

describe('EditCertificationUseCase', () => {
  it('revises a certification that belongs to the caregiver', async () => {
    const store = certRepo(certification());
    await new EditCertificationUseCase(profileRepo(profile()), store).execute({
      profileId: 'cg-1',
      certificationId: 'cert-1',
      name: 'CNA License',
      licenseNumber: 'CNA-IL-99999',
      issuedAt: null,
      expiresAt: new Date('2028-01-01T00:00:00.000Z'),
    });
    expect(store.saved[0].licenseNumber).toBe('CNA-IL-99999');
  });

  it('rejects a certification that belongs to another caregiver', async () => {
    const other = Certification.record({
      id: 'cert-9',
      caregiverId: 'someone-else',
      name: 'CPR',
      expiresAt: NOW,
      now: NOW,
    });
    await expect(
      new EditCertificationUseCase(profileRepo(profile()), certRepo(other)).execute({
        profileId: 'cg-1',
        certificationId: 'cert-9',
        name: 'CPR',
        licenseNumber: null,
        issuedAt: null,
        expiresAt: NOW,
      }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});

describe('RemoveCertificationUseCase', () => {
  it('deletes a certification of the caregiver', async () => {
    const store = certRepo(certification());
    await new RemoveCertificationUseCase(profileRepo(profile()), store).execute({
      profileId: 'cg-1',
      certificationId: 'cert-1',
    });
    expect(store.deleted).toEqual(['cert-1']);
  });
});
