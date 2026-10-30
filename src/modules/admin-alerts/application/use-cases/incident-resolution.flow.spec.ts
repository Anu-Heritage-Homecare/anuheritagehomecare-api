import { Clock } from '@shared/application/ports/clock.port';
import { IdGenerator } from '@shared/application/ports/id-generator.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { AlertSeverity } from '../../domain/alert-severity.enum';
import { IncidentCategory } from '../../domain/incident-category.enum';
import { IncidentResolutionStatus } from '../../domain/incident-resolution-status.enum';
import { IncidentResolution } from '../../domain/incident-resolution.entity';
import { IncidentResolutionRepository } from '../../domain/incident-resolution.repository';
import { IncidentStatus } from '../../domain/incident-status.enum';
import { Incident } from '../../domain/incident.entity';
import { IncidentRepository } from '../../domain/incident.repository';
import { AlertsEnrichmentReadModel } from '../ports/alerts-enrichment-read.port';
import { GetIncidentResolutionUseCase } from './get-incident-resolution.use-case';
import { SaveIncidentResolutionUseCase } from './save-incident-resolution.use-case';

const NOW = new Date('2026-07-18T17:30:00.000Z');
const clock: Clock = { now: () => NOW };
const ids: IdGenerator = { generate: () => 'res-1' };

function incident(resolvedAt: Date | null = null): Incident {
  return Incident.rehydrate('inc-1', {
    sequence: 124,
    category: IncidentCategory.MedicationConcern,
    severity: AlertSeverity.High,
    status: resolvedAt === null ? IncidentStatus.UnderReview : IncidentStatus.Resolved,
    detail: null,
    reporterName: 'Amina Bello',
    reportedByAdminId: 'admin-1',
    assignedCoordinatorAdminId: 'admin-9',
    relatedVisitId: 'v-1',
    relatedCaregiverId: 'cg-1',
    relatedCareRecipientId: 'r-1',
    createdAt: new Date('2026-07-18T16:32:00.000Z'),
    resolvedAt,
    resolvedByAdminId: resolvedAt === null ? null : 'admin-9',
  });
}

function incidentRepo(seed: Incident | null): IncidentRepository & { saved: Incident[] } {
  const saved: Incident[] = [];
  return {
    saved,
    create: (i) => Promise.resolve(i),
    save: (i) => {
      saved.push(i);
      return Promise.resolve();
    },
    findById: () => Promise.resolve(seed),
    listForOverview: () => Promise.resolve([]),
    listResolvedSince: () => Promise.resolve([]),
  };
}

function resolutionRepo(
  seed: IncidentResolution | null = null,
): IncidentResolutionRepository & { saved: IncidentResolution[] } {
  const saved: IncidentResolution[] = [];
  return {
    saved,
    findByIncident: () => Promise.resolve(seed),
    save: (r) => {
      saved.push(r);
      return Promise.resolve();
    },
  };
}

const reads: AlertsEnrichmentReadModel = {
  enrich: () =>
    Promise.resolve({
      recipientNames: new Map(),
      caregiverBranches: new Map(),
      visitServiceTypes: new Map(),
    }),
  adminNames: () => Promise.resolve(new Map([['admin-9', 'Adaeze Nnamdi']])),
};

describe('GetIncidentResolutionUseCase', () => {
  it('returns an empty pending form when none is saved yet', async () => {
    const result = await new GetIncidentResolutionUseCase(
      incidentRepo(incident()),
      resolutionRepo(null),
      reads,
      ids,
      clock,
    ).execute('inc-1');

    expect(result).toMatchObject({
      reference: 'INC-NG-2026-00124',
      statusLabel: 'Pending Resolution',
      resolved: false,
      resolvedBy: null,
      resolutionTimeLabel: null,
    });
  });

  it('throws when the incident does not exist', async () => {
    await expect(
      new GetIncidentResolutionUseCase(
        incidentRepo(null),
        resolutionRepo(null),
        reads,
        ids,
        clock,
      ).execute('missing'),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});

describe('SaveIncidentResolutionUseCase', () => {
  it('saves the form without resolving the incident', async () => {
    const incidents = incidentRepo(incident());
    const resolutions = resolutionRepo(null);
    const result = await new SaveIncidentResolutionUseCase(
      incidents,
      resolutions,
      reads,
      ids,
      clock,
    ).execute({
      incidentId: 'inc-1',
      summary: 'Client medication refusal documented.',
      actionsTaken: 'Caregiver instructed to document refusal.',
      followUpRequired: true,
      followUpDate: new Date('2026-07-19T00:00:00.000Z'),
      followUpNotes: 'Check with family after morning visit.',
      markResolved: false,
      adminId: 'admin-9',
    });

    expect(incidents.saved).toHaveLength(0); // not resolved
    expect(resolutions.saved).toHaveLength(1);
    expect(result).toMatchObject({
      summary: 'Client medication refusal documented.',
      followUpRequired: true,
      followUpDate: '2026-07-19',
      followUpDateLabel: 'Jul 19 2026',
      resolved: false,
    });
  });

  it('marks resolved: resolves the incident and finalises the form', async () => {
    const incidents = incidentRepo(incident());
    const resolutions = resolutionRepo(null);
    const result = await new SaveIncidentResolutionUseCase(
      incidents,
      resolutions,
      reads,
      ids,
      clock,
    ).execute({
      incidentId: 'inc-1',
      summary: 'Resolved.',
      markResolved: true,
      adminId: 'admin-9',
    });

    expect(incidents.saved).toHaveLength(1);
    expect(incidents.saved[0].status).toBe(IncidentStatus.Resolved);
    expect(result).toMatchObject({
      statusLabel: 'Resolved',
      resolved: true,
      resolvedBy: 'Adaeze Nnamdi',
      resolutionTimeLabel: '58m',
    });
    expect(resolutions.saved[0].status).toBe(IncidentResolutionStatus.Resolved);
  });
});
