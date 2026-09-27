import { CaregiverDocument } from '@modules/caregiver-documents/domain/caregiver-document.entity';
import { CaregiverDocumentCategory } from '@modules/caregiver-documents/domain/caregiver-document-category.enum';
import { CaregiverDocumentRepository } from '@modules/caregiver-documents/domain/caregiver-document.repository';
import { CaregiverTraining } from '@modules/caregiver-documents/domain/caregiver-training.entity';
import { CaregiverTrainingStatus } from '@modules/caregiver-documents/domain/caregiver-training-status.enum';
import { CaregiverTrainingRepository } from '@modules/caregiver-documents/domain/caregiver-training.repository';
import { CaregiverProfile } from '@modules/caregiver-profile/domain/caregiver-profile.entity';
import { CaregiverProfileRepository } from '@modules/caregiver-profile/domain/caregiver-profile.repository';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import {
  AddCaregiverDocumentUseCase,
  RecordCaregiverTrainingUseCase,
} from './manage-caregiver-documents.use-case';

const NOW = new Date('2026-07-20T10:00:00.000Z');
const clock = { now: () => NOW };
const ids = { generate: () => 'new-id' };

function profileRepo(profile: CaregiverProfile | null): CaregiverProfileRepository {
  return {
    save: () => Promise.resolve(),
    findById: () => Promise.resolve(profile),
    findByUserId: () => Promise.resolve(null),
  };
}

function documentRepo(): CaregiverDocumentRepository & { saved: CaregiverDocument[] } {
  const saved: CaregiverDocument[] = [];
  return {
    saved,
    save: (d) => {
      saved.push(d);
      return Promise.resolve();
    },
    findById: () => Promise.resolve(null),
    listForCaregiver: () => Promise.resolve([]),
  };
}

function trainingRepo(): CaregiverTrainingRepository & { saved: CaregiverTraining[] } {
  const saved: CaregiverTraining[] = [];
  return {
    saved,
    save: (t) => {
      saved.push(t);
      return Promise.resolve();
    },
    findById: () => Promise.resolve(null),
    listForCaregiver: () => Promise.resolve([]),
  };
}

describe('AddCaregiverDocumentUseCase', () => {
  it('adds an employment document keyed to the caregiver user', async () => {
    const profile = CaregiverProfile.create({ id: 'cg-1', userId: 'user-1', now: NOW });
    const store = documentRepo();
    const result = await new AddCaregiverDocumentUseCase(
      profileRepo(profile),
      store,
      ids,
      clock,
    ).execute({
      profileId: 'cg-1',
      name: 'W-4 Form (2026)',
      category: CaregiverDocumentCategory.Tax,
      documentDate: new Date(Date.UTC(2026, 0, 1)),
      file: { documentKey: 'k', fileName: 'w4.pdf', uploadedBy: 'HR' },
    });
    expect(result.id).toBe('new-id');
    expect(store.saved[0].caregiverId).toBe('user-1');
    expect(store.saved[0].category).toBe(CaregiverDocumentCategory.Tax);
  });

  it('rejects an unknown caregiver', async () => {
    await expect(
      new AddCaregiverDocumentUseCase(profileRepo(null), documentRepo(), ids, clock).execute({
        profileId: 'nope',
        name: 'X',
        category: CaregiverDocumentCategory.Legal,
        documentDate: null,
        file: { documentKey: null, fileName: null, uploadedBy: null },
      }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});

describe('RecordCaregiverTrainingUseCase', () => {
  it('records an in progress training when no completion date is given', async () => {
    const profile = CaregiverProfile.create({ id: 'cg-1', userId: 'user-1', now: NOW });
    const store = trainingRepo();
    await new RecordCaregiverTrainingUseCase(profileRepo(profile), store, ids, clock).execute({
      profileId: 'cg-1',
      name: 'Dementia Care Update',
      completedAt: null,
      certificate: false,
      hoursCompleted: 12,
      hoursRequired: 40,
      file: { documentKey: null, fileName: null, uploadedBy: null },
    });
    expect(store.saved[0].status).toBe(CaregiverTrainingStatus.InProgress);
    expect(store.saved[0].hoursCompleted).toBe(12);
  });
});
