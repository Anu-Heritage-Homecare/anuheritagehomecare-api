import { SosAlert } from '@modules/visits/domain/sos-alert.entity';
import { SosAlertRepository } from '@modules/visits/domain/sos-alert.repository';
import { Clock } from '@shared/application/ports/clock.port';
import { IdGenerator } from '@shared/application/ports/id-generator.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { EmergencyProtocolStep } from '../../domain/emergency-protocol-step.enum';
import { EmergencyResponseRepository } from '../../domain/emergency-response.repository';
import { Incident } from '../../domain/incident.entity';
import { IncidentRepository } from '../../domain/incident.repository';
import { SosProtocolCompletion } from '../../domain/sos-protocol-completion.entity';
import { SosResponseEvent } from '../../domain/sos-response-event.entity';
import { SosResponseEventKind } from '../../domain/sos-response-event-kind.enum';
import { EmergencyEnrichmentReadModel } from '../ports/emergency-enrichment-read.port';
import { AcknowledgeEmergencyUseCase } from './acknowledge-emergency.use-case';
import { GetEmergencyDetailUseCase } from './get-emergency-detail.use-case';
import { LogResponseEventUseCase } from './log-response-event.use-case';
import { ReportIncidentUseCase } from './report-incident.use-case';
import { ToggleProtocolStepUseCase } from './toggle-protocol-step.use-case';

const NOW = new Date('2026-07-24T16:51:00.000Z');
const RAISED = new Date('2026-07-24T16:43:00.000Z'); // 8 minutes earlier
const clock: Clock = { now: () => NOW };

function sos(): SosAlert {
  return SosAlert.raise({
    id: '11111111-1111-1111-1111-111111111111',
    caregiverId: 'cg-1',
    visitId: 'v-1',
    position: null,
    recipient: {
      careRecipientId: 'r1',
      name: 'Mrs. Adeyemi',
      address: 'Victoria Island',
      location: null,
    },
    now: RAISED,
  });
}

function sosRepo(alert: SosAlert | null): SosAlertRepository & { saved: SosAlert[] } {
  const saved: SosAlert[] = [];
  return {
    saved,
    save: (a) => {
      saved.push(a);
      return Promise.resolve();
    },
    findById: () => Promise.resolve(alert),
    listActive: () => Promise.resolve(alert ? [alert] : []),
    listResolvedSince: () => Promise.resolve([]),
  };
}

function responseRepo(): EmergencyResponseRepository & {
  completions: SosProtocolCompletion[];
  events: SosResponseEvent[];
  removed: EmergencyProtocolStep[];
} {
  const completions: SosProtocolCompletion[] = [];
  const events: SosResponseEvent[] = [];
  const removed: EmergencyProtocolStep[] = [];
  return {
    completions,
    events,
    removed,
    listCompletions: () => Promise.resolve(completions),
    saveCompletion: (c) => {
      completions.push(c);
      return Promise.resolve();
    },
    removeCompletion: (_id, step) => {
      removed.push(step);
      return Promise.resolve();
    },
    listEvents: () => Promise.resolve(events),
    appendEvent: (e) => {
      events.push(e);
      return Promise.resolve();
    },
  };
}

const enrichment: EmergencyEnrichmentReadModel = {
  enrich: () => Promise.resolve({ caregiverName: 'Amina Bello', visitService: 'Morning Care' }),
};

function incidentsRepo(incidents: Incident[] = []): IncidentRepository & { created: Incident[] } {
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

const ids: IdGenerator = { generate: () => 'generated-id' };

describe('GetEmergencyDetailUseCase', () => {
  it('assembles details, protocol overlay and a sorted timeline', async () => {
    const alert = sos();
    const response = responseRepo();
    response.completions.push(
      SosProtocolCompletion.complete({
        id: 'c1',
        sosAlertId: alert.id,
        step: EmergencyProtocolStep.NotifyFamily,
        adminId: 'admin-1',
        now: new Date('2026-07-24T16:46:00.000Z'),
      }),
    );

    const result = await new GetEmergencyDetailUseCase(
      sosRepo(alert),
      response,
      enrichment,
      incidentsRepo(),
      clock,
    ).execute(alert.id);

    expect(result.critical).toBe(true);
    expect(result.statusLabel).toBe('New / Unresolved');
    expect(result.details).toMatchObject({
      caregiver: 'Amina Bello',
      careRecipient: 'Mrs. Adeyemi',
      visit: 'Morning Care',
      location: 'Victoria Island',
      durationLabel: '8 minutes',
    });
    // 5 fixed steps, one completed.
    expect(result.protocol).toHaveLength(5);
    expect(
      result.protocol.find((p) => p.step === (EmergencyProtocolStep.NotifyFamily as string))
        ?.completed,
    ).toBe(true);
    // Timeline begins with the SOS press and includes the completed step, time-ordered.
    expect(result.timeline[0].kind).toBe('RAISED');
    expect(result.timeline.some((t) => t.kind === 'STEP_COMPLETED')).toBe(true);
    // No incident logged yet → provisional SOS reference.
    expect(result.reference.startsWith('SOS-')).toBe(true);
  });

  it('throws when the emergency does not exist', async () => {
    await expect(
      new GetEmergencyDetailUseCase(
        sosRepo(null),
        responseRepo(),
        enrichment,
        incidentsRepo(),
        clock,
      ).execute('missing'),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});

describe('AcknowledgeEmergencyUseCase', () => {
  it('acknowledges, assigns and dispatches the alert', async () => {
    const alert = sos();
    const repo = sosRepo(alert);
    await new AcknowledgeEmergencyUseCase(repo, clock).execute({
      sosAlertId: alert.id,
      adminId: 'admin-1',
      assignedTo: 'Regional Supervisor',
    });
    expect(repo.saved[0].acknowledgedAt).toEqual(NOW);
    expect(repo.saved[0].assignedTo).toBe('Regional Supervisor');
    expect(repo.saved[0].dispatchedAt).toEqual(NOW);
  });
});

describe('ToggleProtocolStepUseCase', () => {
  it('ticks and un-ticks a step', async () => {
    const alert = sos();
    const response = responseRepo();
    const useCase = new ToggleProtocolStepUseCase(sosRepo(alert), response, ids, clock);

    await useCase.execute({
      sosAlertId: alert.id,
      step: EmergencyProtocolStep.AssessVisit,
      completed: true,
      adminId: 'admin-1',
    });
    expect(response.completions).toHaveLength(1);

    await useCase.execute({
      sosAlertId: alert.id,
      step: EmergencyProtocolStep.AssessVisit,
      completed: false,
      adminId: 'admin-1',
    });
    expect(response.removed).toEqual([EmergencyProtocolStep.AssessVisit]);
  });
});

describe('LogResponseEventUseCase', () => {
  it('appends a note without creating an incident', async () => {
    const alert = sos();
    const response = responseRepo();
    const incidents = incidentsRepo();
    await new LogResponseEventUseCase(
      sosRepo(alert),
      response,
      new ReportIncidentUseCase(incidents, ids, clock),
      ids,
      clock,
    ).execute({
      sosAlertId: alert.id,
      kind: SosResponseEventKind.Note,
      description: 'Called the family, no answer.',
      adminId: 'admin-1',
    });
    expect(incidents.created).toHaveLength(0);
    expect(response.events[0].description).toBe('Called the family, no answer.');
  });

  it('files and links a real incident for an INCIDENT_LOGGED entry', async () => {
    const alert = sos();
    const response = responseRepo();
    const incidents = incidentsRepo();
    await new LogResponseEventUseCase(
      sosRepo(alert),
      response,
      new ReportIncidentUseCase(incidents, ids, clock),
      ids,
      clock,
    ).execute({
      sosAlertId: alert.id,
      kind: SosResponseEventKind.IncidentLogged,
      adminId: 'admin-1',
    });
    expect(incidents.created).toHaveLength(1);
    expect(response.events[0].linkedIncidentId).toBe('generated-id');
    expect(response.events[0].description).toContain('INC-');
  });
});
