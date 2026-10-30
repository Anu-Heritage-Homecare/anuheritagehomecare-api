import { Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { AlertSeverity } from '../../domain/alert-severity.enum';
import { IncidentCategory } from '../../domain/incident-category.enum';
import { IncidentStatus } from '../../domain/incident-status.enum';
import { Incident } from '../../domain/incident.entity';
import { IncidentRepository } from '../../domain/incident.repository';
import { IncidentDetailReadModel } from '../ports/incident-detail-read.port';
import { AssignIncidentCoordinatorUseCase } from './assign-incident-coordinator.use-case';
import { GetIncidentDetailUseCase } from './get-incident-detail.use-case';
import { ManageIncidentUseCase } from './manage-incident.use-case';

const NOW = new Date('2026-07-24T12:00:00.000Z');
const clock: Clock = { now: () => NOW };

function incident(): Incident {
  return Incident.rehydrate('inc-1', {
    sequence: 124,
    category: IncidentCategory.MedicationConcern,
    severity: AlertSeverity.High,
    status: IncidentStatus.UnderReview,
    detail: 'Caregiver reports client refused evening medication.',
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

function repo(seed: Incident | null): IncidentRepository & { saved: Incident[] } {
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

const reads: IncidentDetailReadModel = {
  enrich: () =>
    Promise.resolve({
      recipient: {
        name: 'Mrs. Funmilayo Adeyemi',
        dateOfBirth: new Date('1952-01-10T00:00:00.000Z'),
        medicalConditions: ['Early-stage Dementia', 'Hypertension'],
        allergies: [],
        relationship: 'Mother',
        ownerName: 'Samuel Adeyemi',
        ownerPhone: '+234 803 111 2222',
      },
      caregiver: {
        name: 'Amina Bello',
        designation: 'Certified Nurse Assistant (CNA)',
        phone: '+234 809 333 4444',
        supervisorName: 'Bola Ogundimu',
      },
      visit: {
        sequence: 872,
        scheduledDate: new Date('2026-07-18T00:00:00.000Z'),
        startMinute: 960, // 4:00 PM
        endMinute: 1200, // 8:00 PM
        visitType: 'DEMENTIA_CARE',
        status: 'IN_PROGRESS',
      },
      coordinatorName: 'Adaeze Nnamdi',
    }),
};

describe('GetIncidentDetailUseCase', () => {
  it('assembles the incident with its recipient, caregiver and visit', async () => {
    const result = await new GetIncidentDetailUseCase(repo(incident()), reads, clock).execute(
      'inc-1',
    );

    expect(result).toMatchObject({
      reference: 'INC-NG-2026-00124',
      incidentType: 'Medication Concern',
      priorityLabel: 'High Priority',
      statusLabel: 'Under Review',
      active: true,
      reportedBy: 'Amina Bello',
      reportedTime: '4:32 PM, Jul 18 2026',
      assignedCoordinator: 'Adaeze Nnamdi',
    });
    expect(result.recipient).toMatchObject({
      name: 'Mrs. Funmilayo Adeyemi',
      age: 74,
      primaryLanguage: null,
      emergencyContact: 'Samuel Adeyemi • +234 803 111 2222',
      diagnosedConditions: ['Early-stage Dementia', 'Hypertension'],
    });
    expect(result.relatedVisit).toMatchObject({
      reference: 'VIS-NG-2026-00872',
      scheduleLabel: 'Jul 18 2026, 4:00 PM to 8:00 PM',
      serviceType: 'Dementia Care',
      statusLabel: 'In Progress',
    });
  });

  it('throws when the incident does not exist', async () => {
    await expect(
      new GetIncidentDetailUseCase(repo(null), reads, clock).execute('missing'),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});

describe('ManageIncidentUseCase', () => {
  it('starts review and assigns the acting coordinator', async () => {
    const open = Incident.report({
      id: 'i2',
      category: IncidentCategory.RecipientFall,
      severity: AlertSeverity.Medium,
      reportedByAdminId: 'admin-1',
      now: NOW,
    });
    const store = repo(open);
    const result = await new ManageIncidentUseCase(store, clock).execute({
      incidentId: 'i2',
      action: 'REVIEW',
      adminId: 'admin-7',
    });
    expect(result.statusLabel).toBe('Under Review');
    expect(store.saved[0].assignedCoordinatorAdminId).toBe('admin-7');
  });

  it('escalates to critical priority', async () => {
    const open = Incident.report({
      id: 'i3',
      category: IncidentCategory.ServiceComplaint,
      severity: AlertSeverity.Low,
      reportedByAdminId: 'admin-1',
      now: NOW,
    });
    const store = repo(open);
    await new ManageIncidentUseCase(store, clock).execute({
      incidentId: 'i3',
      action: 'ESCALATE',
      adminId: 'admin-1',
    });
    expect(store.saved[0].severity).toBe(AlertSeverity.Critical);
  });

  it('resolves an under review incident', async () => {
    const store = repo(incident());
    const result = await new ManageIncidentUseCase(store, clock).execute({
      incidentId: 'inc-1',
      action: 'RESOLVE',
      adminId: 'admin-1',
    });
    expect(result.statusLabel).toBe('Resolved');
    expect(store.saved[0].resolvedAt).toEqual(NOW);
  });
});

describe('AssignIncidentCoordinatorUseCase', () => {
  it('assigns the coordinator', async () => {
    const open = Incident.report({
      id: 'i4',
      category: IncidentCategory.Behavioural,
      severity: AlertSeverity.Medium,
      reportedByAdminId: 'admin-1',
      now: NOW,
    });
    const store = repo(open);
    await new AssignIncidentCoordinatorUseCase(store).execute({
      incidentId: 'i4',
      coordinatorAdminId: 'admin-5',
    });
    expect(store.saved[0].assignedCoordinatorAdminId).toBe('admin-5');
  });
});
