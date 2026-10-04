import { Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { CaregiverDocumentsTabView, CaregiverReadModel } from '../ports/caregiver-read.port';
import { GetCaregiverDocumentsUseCase } from './get-caregiver-documents.use-case';

const NOW = new Date('2026-07-20T10:00:00.000Z');
const clock: Clock = { now: () => NOW };

function view(): CaregiverDocumentsTabView {
  return {
    credentials: [
      {
        id: 'c1',
        name: 'CPR/First Aid',
        kind: 'CERTIFICATION',
        licenseNumber: 'CPR-2026-156',
        issuedAt: new Date(Date.UTC(2026, 2, 1)),
        expiresAt: new Date(Date.UTC(2026, 9, 1)),
        documentKey: 'key-cpr',
        fileName: 'CPR_Certificate_2026.pdf',
        uploadedBy: 'Caregiver',
        createdAt: new Date(Date.UTC(2026, 2, 10)),
      },
      {
        id: 'c2',
        name: 'Background Check',
        kind: 'BACKGROUND_CHECK',
        licenseNumber: 'BGC-2026-001',
        issuedAt: new Date(Date.UTC(2026, 6, 1)),
        expiresAt: new Date(Date.UTC(2027, 6, 1)),
        documentKey: 'key-bgc',
        fileName: 'BGC_Sarah_Williams_2026.pdf',
        uploadedBy: 'HR',
        createdAt: new Date(Date.UTC(2026, 6, 15)),
      },
    ],
    documents: [
      {
        id: 'd1',
        name: 'Employment Contract',
        category: 'LEGAL',
        status: 'ACTIVE',
        documentDate: new Date(Date.UTC(2019, 2, 1)),
        documentKey: null,
        fileName: null,
        uploadedBy: null,
        createdAt: new Date(Date.UTC(2019, 2, 1)),
      },
    ],
    trainings: [
      {
        id: 't1',
        name: 'Dementia Care Update',
        status: 'IN_PROGRESS',
        completedAt: null,
        certificate: false,
        hoursCompleted: 12,
        hoursRequired: 40,
        documentKey: null,
        fileName: null,
        uploadedBy: null,
        createdAt: new Date(Date.UTC(2026, 6, 5)),
      },
    ],
  };
}

function reads(tab: CaregiverDocumentsTabView | null): CaregiverReadModel {
  return {
    list: () => Promise.resolve({ total: 0, rows: [] }),
    overview: () => Promise.resolve(null),
    scheduleTab: () => Promise.resolve(null),
    performanceTab: () => Promise.resolve(null),
    documentsTab: () => Promise.resolve(tab),
  };
}

describe('GetCaregiverDocumentsUseCase', () => {
  it('derives the compliance summary, credential statuses and upload history', async () => {
    const result = await new GetCaregiverDocumentsUseCase(reads(view()), clock).execute({
      profileId: 'cg-1',
    });

    expect(result.summary.overallStatus).toBe('Fully Compliant');
    expect(result.summary.nextImpendingExpiry?.name).toBe('CPR/First Aid');
    expect(result.summary.nextImpendingExpiry?.daysRemaining).toBe(73);
    expect(result.summary.documentsOnFile).toBe(4);
    expect(result.summary.requirementsTotal).toBe(2);
    expect(result.summary.requirementsMet).toBe(2);
    expect(result.summary.message).toContain('All 2 regulatory requirements');
    expect(result.summary.message).toContain('valid until Jul 2027');

    // Renewals are ordered by soonest expiry, each with an urgency.
    expect(result.upcomingRenewals.map((r) => r.name)).toEqual([
      'CPR/First Aid',
      'Background Check',
    ]);
    expect(result.upcomingRenewals[0].urgency).toBe('REQUIRED');
    expect(result.upcomingRenewals[1].urgency).toBe('UPCOMING');

    const cpr = result.certifications.find((c) => c.id === 'c1');
    expect(cpr?.status).toBe('Valid');
    expect(cpr?.hasDocument).toBe(true);
    const bgc = result.certifications.find((c) => c.id === 'c2');
    expect(bgc?.status).toBe('Cleared');

    expect(result.employmentDocuments[0].hasDocument).toBe(false);
    expect(result.trainingRecords[0].hoursLabel).toBe('12/40h');
    expect(result.trainingRecords[0].status).toBe('IN_PROGRESS');

    // Only the two credentials carry files, newest first.
    expect(result.uploadHistory).toHaveLength(2);
    expect(result.uploadHistory[0].title).toBe('Background Check');
    expect(result.uploadHistory[0].uploadedBy).toBe('HR');
  });

  it('flags attention when a credential expires within the window', async () => {
    const soon = view();
    soon.credentials[0].expiresAt = new Date(Date.UTC(2026, 7, 10)); // ~21 days out
    const result = await new GetCaregiverDocumentsUseCase(reads(soon), clock).execute({
      profileId: 'cg-1',
    });
    expect(result.summary.overallStatus).toBe('Attention');
  });

  it('reports Non-compliant when a credential has expired', async () => {
    const expired = view();
    expired.credentials[0].expiresAt = new Date(Date.UTC(2026, 5, 1)); // before now
    const result = await new GetCaregiverDocumentsUseCase(reads(expired), clock).execute({
      profileId: 'cg-1',
    });
    expect(result.summary.overallStatus).toBe('Non-compliant');
    expect(result.certifications.find((c) => c.id === 'c1')?.status).toBe('Expired');
  });

  it('rejects an unknown caregiver', async () => {
    await expect(
      new GetCaregiverDocumentsUseCase(reads(null), clock).execute({ profileId: 'nope' }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});
