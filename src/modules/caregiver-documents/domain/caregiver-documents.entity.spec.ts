import { ValidationException } from '@shared/domain/domain-exception';
import { CaregiverDocument } from './caregiver-document.entity';
import { CaregiverDocumentCategory } from './caregiver-document-category.enum';
import { CaregiverDocumentStatus } from './caregiver-document-status.enum';
import { CaregiverTraining } from './caregiver-training.entity';
import { CaregiverTrainingStatus } from './caregiver-training-status.enum';

const NOW = new Date('2026-07-15T09:00:00.000Z');

describe('CaregiverDocument', () => {
  it('records an employment document with a default active status and trimmed file', () => {
    const document = CaregiverDocument.record({
      id: 'd1',
      caregiverId: 'user-1',
      name: '  Employment Contract  ',
      category: CaregiverDocumentCategory.Legal,
      documentDate: new Date(Date.UTC(2019, 2, 1)),
      file: { fileName: '  contract.pdf  ', uploadedBy: 'HR' },
      now: NOW,
    });
    expect(document.name).toBe('Employment Contract');
    expect(document.status).toBe(CaregiverDocumentStatus.Active);
    expect(document.fileName).toBe('contract.pdf');
    expect(document.uploadedBy).toBe('HR');
  });

  it('rejects a blank name', () => {
    expect(() =>
      CaregiverDocument.record({
        id: 'd2',
        caregiverId: 'user-1',
        name: '   ',
        category: CaregiverDocumentCategory.Tax,
        now: NOW,
      }),
    ).toThrow(ValidationException);
  });
});

describe('CaregiverTraining', () => {
  it('marks a training with a completion date as completed', () => {
    const training = CaregiverTraining.record({
      id: 't1',
      caregiverId: 'user-1',
      name: 'Alzheimer Care Advanced',
      completedAt: new Date(Date.UTC(2026, 5, 1)),
      certificate: true,
      hoursCompleted: 40,
      hoursRequired: 40,
      now: NOW,
    });
    expect(training.status).toBe(CaregiverTrainingStatus.Completed);
    expect(training.certificate).toBe(true);
    expect(training.hoursCompleted).toBe(40);
  });

  it('marks a training without a completion date as in progress', () => {
    const training = CaregiverTraining.record({
      id: 't2',
      caregiverId: 'user-1',
      name: 'Dementia Care Update',
      hoursCompleted: 12,
      hoursRequired: 40,
      now: NOW,
    });
    expect(training.status).toBe(CaregiverTrainingStatus.InProgress);
    expect(training.completedAt).toBeNull();
  });

  it('rejects negative hours', () => {
    expect(() =>
      CaregiverTraining.record({
        id: 't3',
        caregiverId: 'user-1',
        name: 'Fall Prevention',
        hoursCompleted: -1,
        now: NOW,
      }),
    ).toThrow(ValidationException);
  });
});
