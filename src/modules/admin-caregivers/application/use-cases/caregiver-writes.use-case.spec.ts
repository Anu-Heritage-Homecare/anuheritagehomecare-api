import { CaregiverProfile } from '@modules/caregiver-profile/domain/caregiver-profile.entity';
import { CaregiverNoteKind } from '@modules/caregiver-profile/domain/caregiver-note-kind.enum';
import { CaregiverProfileRepository } from '@modules/caregiver-profile/domain/caregiver-profile.repository';
import { CaregiverStatus } from '@modules/caregiver-profile/domain/caregiver-status.enum';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import {
  AddCaregiverNoteUseCase,
  DeleteCaregiverUseCase,
  EditCaregiverUseCase,
} from './edit-caregiver.use-case';

const NOW = new Date('2026-09-20T10:00:00.000Z');
const clock = { now: () => NOW };

function profile(): CaregiverProfile {
  return CaregiverProfile.create({ id: 'cg-1', userId: 'user-1', now: NOW });
}

function repo(
  found: CaregiverProfile | null,
): CaregiverProfileRepository & { saved: CaregiverProfile[] } {
  const saved: CaregiverProfile[] = [];
  return {
    saved,
    save: (p) => {
      saved.push(p);
      return Promise.resolve();
    },
    findById: () => Promise.resolve(found),
    findByUserId: () => Promise.resolve(null),
  };
}

describe('EditCaregiverUseCase', () => {
  it('sets skills on the profile', async () => {
    const p = profile();
    await new EditCaregiverUseCase(repo(p), clock).execute({
      profileId: 'cg-1',
      section: 'SKILLS',
      skills: ['Wound Care', 'Dementia Care'],
    });
    expect(p.skills).toEqual(['Wound Care', 'Dementia Care']);
  });

  it('sets the status on the profile', async () => {
    const p = profile();
    await new EditCaregiverUseCase(repo(p), clock).execute({
      profileId: 'cg-1',
      section: 'STATUS',
      status: CaregiverStatus.OnLeave,
    });
    expect(p.status).toBe(CaregiverStatus.OnLeave);
  });

  it('sets the preferences note', async () => {
    const p = profile();
    await new EditCaregiverUseCase(repo(p), clock).execute({
      profileId: 'cg-1',
      section: 'PREFERENCES',
      preferencesNote: 'Available for weekend emergency coverage.',
    });
    expect(p.preferencesNote).toBe('Available for weekend emergency coverage.');
  });

  it('rejects an unknown caregiver', async () => {
    await expect(
      new EditCaregiverUseCase(repo(null), clock).execute({
        profileId: 'nope',
        section: 'SKILLS',
        skills: [],
      }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});

describe('DeleteCaregiverUseCase', () => {
  it('archives the profile', async () => {
    const p = profile();
    const store = repo(p);
    await new DeleteCaregiverUseCase(store, clock).execute('cg-1');
    expect(p.isArchived).toBe(true);
    expect(store.saved).toHaveLength(1);
  });

  it('rejects an unknown caregiver', async () => {
    await expect(
      new DeleteCaregiverUseCase(repo(null), clock).execute('nope'),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});

describe('AddCaregiverNoteUseCase', () => {
  it('appends a note to the profile', async () => {
    const p = profile();
    const store = repo(p);
    await new AddCaregiverNoteUseCase(store, clock).execute({
      profileId: 'cg-1',
      adminId: 'admin-1',
      body: 'Excellent handling of medication change.',
      kind: CaregiverNoteKind.Supervisor,
      authorName: 'Mike Chen',
      authorRole: 'Care Coordinator',
    });
    expect(p.noteLog[0].body).toBe('Excellent handling of medication change.');
    expect(p.noteLog[0].kind).toBe(CaregiverNoteKind.Supervisor);
    expect(store.saved).toHaveLength(1);
  });
});
