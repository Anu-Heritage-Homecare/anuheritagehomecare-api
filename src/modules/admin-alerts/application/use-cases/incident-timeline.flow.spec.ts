import { Clock } from '@shared/application/ports/clock.port';
import { IdGenerator } from '@shared/application/ports/id-generator.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { AlertSeverity } from '../../domain/alert-severity.enum';
import { IncidentCategory } from '../../domain/incident-category.enum';
import { IncidentStatus } from '../../domain/incident-status.enum';
import { Incident } from '../../domain/incident.entity';
import { IncidentRepository } from '../../domain/incident.repository';
import { IncidentTimelineEventKind } from '../../domain/incident-timeline-event-kind.enum';
import { IncidentTimelineEvent } from '../../domain/incident-timeline-event.entity';
import { IncidentTimelineRepository } from '../../domain/incident-timeline.repository';
import { AlertsEnrichmentReadModel } from '../ports/alerts-enrichment-read.port';
import { GetIncidentTimelineUseCase } from './get-incident-timeline.use-case';
import { LogIncidentTimelineEventUseCase } from './log-incident-timeline-event.use-case';

const NOW = new Date('2026-07-18T18:00:00.000Z');
const clock: Clock = { now: () => NOW };
const ids: IdGenerator = { generate: () => 'evt-1' };

function incident(status = IncidentStatus.UnderReview, resolvedAt: Date | null = null): Incident {
  return Incident.rehydrate('inc-1', {
    sequence: 124,
    category: IncidentCategory.MedicationConcern,
    severity: AlertSeverity.High,
    status,
    detail: 'Client refused evening medication.',
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

function incidentRepo(seed: Incident | null): IncidentRepository {
  return {
    create: (i) => Promise.resolve(i),
    save: () => Promise.resolve(),
    findById: () => Promise.resolve(seed),
    listForOverview: () => Promise.resolve([]),
    listResolvedSince: () => Promise.resolve([]),
  };
}

function timelineRepo(
  events: IncidentTimelineEvent[] = [],
): IncidentTimelineRepository & { appended: IncidentTimelineEvent[] } {
  const appended: IncidentTimelineEvent[] = [];
  return {
    appended,
    listForIncident: () => Promise.resolve(events),
    append: (e) => {
      appended.push(e);
      return Promise.resolve();
    },
  };
}

const enrichment: AlertsEnrichmentReadModel = {
  enrich: () =>
    Promise.resolve({
      recipientNames: new Map(),
      caregiverBranches: new Map(),
      visitServiceTypes: new Map(),
    }),
  adminNames: () => Promise.resolve(new Map([['admin-9', 'Adaeze Nnamdi']])),
};

function contactEvent(): IncidentTimelineEvent {
  return IncidentTimelineEvent.append({
    id: 'c1',
    incidentId: 'inc-1',
    kind: IncidentTimelineEventKind.CaregiverContact,
    title: 'Coordinator Contacted Caregiver',
    description: 'Advised to document refusal and not force medication.',
    actorName: 'Adaeze Nnamdi',
    actorRole: 'Coordinator',
    now: new Date('2026-07-18T16:38:00.000Z'),
  });
}

describe('GetIncidentTimelineUseCase', () => {
  it('merges the derived reported event with appended events, oldest first', async () => {
    const result = await new GetIncidentTimelineUseCase(
      incidentRepo(incident()),
      timelineRepo([contactEvent()]),
      enrichment,
      clock,
    ).execute('inc-1');

    expect(result.reference).toBe('INC-NG-2026-00124');
    expect(result.entries).toHaveLength(2);
    expect(result.entries[0]).toMatchObject({
      title: 'Incident Reported',
      actor: 'Amina Bello (Caregiver)',
      timeLabel: '4:32 PM',
      dayLabel: 'Today',
      kind: 'REPORTED',
    });
    expect(result.entries[1]).toMatchObject({
      title: 'Coordinator Contacted Caregiver',
      actor: 'Adaeze Nnamdi (Coordinator)',
    });
  });

  it('appends a derived resolved event with the resolver name', async () => {
    const resolvedAt = new Date('2026-07-18T17:30:00.000Z');
    const result = await new GetIncidentTimelineUseCase(
      incidentRepo(incident(IncidentStatus.Resolved, resolvedAt)),
      timelineRepo([]),
      enrichment,
      clock,
    ).execute('inc-1');

    const resolved = result.entries.find((e) => e.kind === 'RESOLVED');
    expect(resolved).toMatchObject({
      title: 'Incident Resolved',
      actor: 'Adaeze Nnamdi (Coordinator)',
    });
  });

  it('throws when the incident does not exist', async () => {
    await expect(
      new GetIncidentTimelineUseCase(
        incidentRepo(null),
        timelineRepo([]),
        enrichment,
        clock,
      ).execute('missing'),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});

describe('LogIncidentTimelineEventUseCase', () => {
  it('appends a timeline entry', async () => {
    const store = timelineRepo([]);
    await new LogIncidentTimelineEventUseCase(incidentRepo(incident()), store, ids, clock).execute({
      incidentId: 'inc-1',
      kind: IncidentTimelineEventKind.FamilyNotification,
      title: 'Family Contact Notified',
      description: 'Family contact notified via phone regarding medication refusal.',
      actorName: 'Adaeze Nnamdi',
      actorRole: 'Coordinator',
      adminId: 'admin-9',
    });

    expect(store.appended).toHaveLength(1);
    expect(store.appended[0].title).toBe('Family Contact Notified');
    expect(store.appended[0].actorRole).toBe('Coordinator');
  });

  it('throws when the incident does not exist', async () => {
    await expect(
      new LogIncidentTimelineEventUseCase(incidentRepo(null), timelineRepo([]), ids, clock).execute(
        {
          incidentId: 'missing',
          kind: IncidentTimelineEventKind.Note,
          title: 'Note',
          description: 'x',
          adminId: 'admin-1',
        },
      ),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});
