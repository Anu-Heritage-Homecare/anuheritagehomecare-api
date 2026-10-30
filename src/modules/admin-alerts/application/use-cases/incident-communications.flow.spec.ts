import { Clock } from '@shared/application/ports/clock.port';
import { IdGenerator } from '@shared/application/ports/id-generator.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { AlertSeverity } from '../../domain/alert-severity.enum';
import { CommunicationChannel } from '../../domain/communication-channel.enum';
import { CommunicationOutcome } from '../../domain/communication-outcome.enum';
import { IncidentCategory } from '../../domain/incident-category.enum';
import { IncidentStatus } from '../../domain/incident-status.enum';
import { Incident } from '../../domain/incident.entity';
import { IncidentCommunication } from '../../domain/incident-communication.entity';
import { IncidentCommunicationRepository } from '../../domain/incident-communication.repository';
import { IncidentRepository } from '../../domain/incident.repository';
import { IncidentDetailReadModel } from '../ports/incident-detail-read.port';
import { GetIncidentCommunicationsUseCase } from './get-incident-communications.use-case';
import { RecordIncidentCommunicationUseCase } from './record-incident-communication.use-case';

const NOW = new Date('2026-07-18T18:00:00.000Z');
const clock: Clock = { now: () => NOW };
const ids: IdGenerator = { generate: () => 'comm-1' };

function incident(): Incident {
  return Incident.rehydrate('inc-1', {
    sequence: 124,
    category: IncidentCategory.MedicationConcern,
    severity: AlertSeverity.High,
    status: IncidentStatus.UnderReview,
    detail: null,
    reporterName: 'Amina Bello',
    reportedByAdminId: 'admin-1',
    assignedCoordinatorAdminId: 'admin-9',
    relatedVisitId: 'v-1',
    relatedCaregiverId: 'cg-1',
    relatedCareRecipientId: 'r-1',
    createdAt: new Date('2026-07-18T16:32:00.000Z'),
    resolvedAt: null,
    resolvedByAdminId: null,
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

function commRepo(
  rows: IncidentCommunication[] = [],
): IncidentCommunicationRepository & { recorded: IncidentCommunication[] } {
  const recorded: IncidentCommunication[] = [];
  return {
    recorded,
    listForIncident: () => Promise.resolve(rows),
    record: (c) => {
      recorded.push(c);
      return Promise.resolve();
    },
  };
}

const reads: IncidentDetailReadModel = {
  enrich: () =>
    Promise.resolve({
      recipient: {
        name: 'Mrs. Funmilayo Adeyemi',
        dateOfBirth: new Date('1952-01-10T00:00:00.000Z'),
        medicalConditions: [],
        allergies: [],
        relationship: 'Daughter',
        ownerName: 'Yetunde Adeyemi',
        ownerPhone: '+234 803 111 2222',
      },
      caregiver: {
        name: 'Amina Bello',
        designation: 'Certified Nurse Assistant (CNA)',
        phone: '+234 809 333 4444',
        supervisorName: 'Bola Ogundimu',
      },
      visit: null,
      coordinatorName: null,
    }),
};

function phoneCall(): IncidentCommunication {
  return IncidentCommunication.record({
    id: 'c1',
    incidentId: 'inc-1',
    channel: CommunicationChannel.PhoneCall,
    outcome: CommunicationOutcome.Reached,
    contactName: 'Amina Bello',
    contactRole: 'Caregiver',
    notes: 'Advised to document refusal, do not force.',
    now: new Date('2026-07-18T16:38:00.000Z'),
  });
}

describe('GetIncidentCommunicationsUseCase', () => {
  it('returns the communication log and the Quick Contact Book', async () => {
    const result = await new GetIncidentCommunicationsUseCase(
      incidentRepo(incident()),
      commRepo([phoneCall()]),
      reads,
      clock,
    ).execute('inc-1');

    expect(result.reference).toBe('INC-NG-2026-00124');
    expect(result.communications).toHaveLength(1);
    expect(result.communications[0]).toMatchObject({
      contactName: 'Amina Bello',
      contactRole: 'Caregiver',
      channelLabel: 'Phone Call',
      outcomeLabel: 'Reached',
      timestampLabel: '4:38 PM, Jul 18 2026',
    });
    expect(result.contactBook).toEqual({
      familyEmergencyContact: {
        name: 'Yetunde Adeyemi',
        subtitle: 'Daughter',
        phone: '+234 803 111 2222',
      },
      assignedCaregiver: {
        name: 'Amina Bello',
        subtitle: 'Certified Nurse Assistant (CNA)',
        phone: '+234 809 333 4444',
      },
      escalationSupervisor: { name: 'Bola Ogundimu', subtitle: null, phone: null },
    });
  });

  it('throws when the incident does not exist', async () => {
    await expect(
      new GetIncidentCommunicationsUseCase(incidentRepo(null), commRepo([]), reads, clock).execute(
        'missing',
      ),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});

describe('RecordIncidentCommunicationUseCase', () => {
  it('records a communication', async () => {
    const store = commRepo([]);
    await new RecordIncidentCommunicationUseCase(
      incidentRepo(incident()),
      store,
      ids,
      clock,
    ).execute({
      incidentId: 'inc-1',
      channel: CommunicationChannel.InternalMessage,
      outcome: CommunicationOutcome.Acknowledged,
      contactName: 'Bola Ogundimu',
      contactRole: 'Supervisor',
      notes: 'Reviewing incident. No immediate escalation needed.',
      adminId: 'admin-9',
    });

    expect(store.recorded).toHaveLength(1);
    expect(store.recorded[0]).toMatchObject({
      contactName: 'Bola Ogundimu',
      contactRole: 'Supervisor',
    });
  });

  it('throws when the incident does not exist', async () => {
    await expect(
      new RecordIncidentCommunicationUseCase(incidentRepo(null), commRepo([]), ids, clock).execute({
        incidentId: 'missing',
        channel: CommunicationChannel.PhoneCall,
        outcome: CommunicationOutcome.NoAnswer,
        contactName: 'X',
        adminId: 'admin-1',
      }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});
