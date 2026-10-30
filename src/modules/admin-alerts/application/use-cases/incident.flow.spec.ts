import { Clock } from '@shared/application/ports/clock.port';
import { IdGenerator } from '@shared/application/ports/id-generator.port';
import { ValidationException } from '@shared/domain/domain-exception';
import { AlertSeverity } from '../../domain/alert-severity.enum';
import { IncidentCategory } from '../../domain/incident-category.enum';
import { IncidentStatus } from '../../domain/incident-status.enum';
import { Incident } from '../../domain/incident.entity';
import { IncidentRepository } from '../../domain/incident.repository';
import { incidentNumber } from '../incident-presenter';
import { ListIncidentsUseCase } from './list-incidents.use-case';
import { ReportIncidentUseCase } from './report-incident.use-case';

const NOW = new Date('2026-07-24T12:00:00.000Z');
const clock: Clock = { now: () => NOW };
const ids: IdGenerator = { generate: () => 'incident-1' };

function repo(incidents: Incident[] = []): IncidentRepository & { created: Incident[] } {
  const created: Incident[] = [];
  return {
    created,
    create: (i) => {
      created.push(i);
      return Promise.resolve(i);
    },
    save: () => Promise.resolve(),
    findById: (id) => Promise.resolve(incidents.find((i) => i.id === id) ?? null),
    listForOverview: () => Promise.resolve(incidents),
    listResolvedSince: () => Promise.resolve(incidents),
  };
}

describe('incidentNumber', () => {
  it('formats the human reference from the sequence and year', () => {
    expect(incidentNumber(124, NOW)).toBe('INC-NG-2026-00124');
    expect(incidentNumber(null, NOW)).toBe('INC-NG-2026-00000');
  });
});

describe('Incident lifecycle', () => {
  it('resolves then closes, and refuses to resolve a non open incident', () => {
    const i = Incident.report({
      id: 'i1',
      category: IncidentCategory.RecipientFall,
      severity: AlertSeverity.High,
      now: NOW,
    });
    expect(i.status).toBe(IncidentStatus.Open);

    i.resolve('admin-1', NOW);
    expect(i.status).toBe(IncidentStatus.Resolved);
    expect(() => i.resolve('admin-1', NOW)).toThrow(ValidationException);

    i.closeOut('admin-1', NOW);
    expect(i.status).toBe(IncidentStatus.Closed);
  });
});

describe('ReportIncidentUseCase', () => {
  it('files an incident and returns its row', async () => {
    const store = repo();
    const row = await new ReportIncidentUseCase(store, ids, clock).execute({
      category: IncidentCategory.MedicationConcern,
      severity: AlertSeverity.Medium,
      reportedByAdminId: 'admin-1',
    });

    expect(store.created).toHaveLength(1);
    expect(row).toMatchObject({
      id: 'incident-1',
      description: 'Medication Concern',
      reporter: 'Unassigned',
      priority: AlertSeverity.Medium,
      status: 'Open',
    });
  });
});

describe('ListIncidentsUseCase', () => {
  it('maps incidents to table rows with their reference and reporter', async () => {
    const seeded = Incident.rehydrate('i2', {
      sequence: 123,
      category: IncidentCategory.ServiceComplaint,
      severity: AlertSeverity.Medium,
      status: IncidentStatus.Closed,
      detail: null,
      reporterName: 'Operations Lead',
      reportedByAdminId: null,
      assignedCoordinatorAdminId: null,
      relatedVisitId: null,
      relatedCaregiverId: null,
      relatedCareRecipientId: null,
      createdAt: NOW,
      resolvedAt: NOW,
      resolvedByAdminId: 'admin-1',
    });

    const result = await new ListIncidentsUseCase(repo([seeded]), clock).execute();

    expect(result.items).toEqual([
      expect.objectContaining({
        id: 'i2',
        incidentId: 'INC-NG-2026-00123',
        description: 'Service Complaint',
        reporter: 'Operations Lead',
        status: 'Closed',
      }),
    ]);
  });
});
