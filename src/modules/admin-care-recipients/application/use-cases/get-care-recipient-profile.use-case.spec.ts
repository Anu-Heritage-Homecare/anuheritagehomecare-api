import { OperationalAlert } from '@modules/admin-alerts/domain/operational-alert.entity';
import { OperationalAlertRepository } from '@modules/admin-alerts/domain/operational-alert.repository';
import { AlertSeverity } from '@modules/admin-alerts/domain/alert-severity.enum';
import { AlertType } from '@modules/admin-alerts/domain/alert-type.enum';
import { CareRecipientPriority } from '@modules/care-recipients/domain/care-recipient-priority.enum';
import { CareRecipient } from '@modules/care-recipients/domain/care-recipient.entity';
import { CareSchedule } from '@modules/care-recipients/domain/value-objects/care-schedule.vo';
import { HealthInformation } from '@modules/care-recipients/domain/value-objects/health-information.vo';
import {
  InMemoryCareRecipientRepository,
  buildProfile,
} from '@modules/care-recipients/test-support/doubles';
import { User } from '@modules/identity/domain/user.entity';
import { UserRepository } from '@modules/identity/domain/user.repository';
import { Visit } from '@modules/visits/domain/visit.entity';
import { VisitRepository } from '@modules/visits/domain/visit.repository';
import { VisitStatus } from '@modules/visits/domain/visit-status.enum';
import { buildVisit } from '@modules/visits/test-support/doubles';
import { VisitNote } from '@modules/visits/domain/value-objects/visit-note.vo';
import { NoteAudience } from '@modules/visits/domain/note-audience.enum';
import { Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { CareRecipientReadModel } from '../ports/care-recipient-read.port';
import { GetCareRecipientProfileUseCase } from './get-care-recipient-profile.use-case';

const NOW = new Date('2026-07-15T12:00:00.000Z');
const clock: Clock = { now: () => NOW };
const RECIPIENT_ID = 'care-1';

function buildRecipient(): CareRecipient {
  const recipient = CareRecipient.startDraft({
    id: RECIPIENT_ID,
    ownerId: 'owner-1',
    profile: buildProfile(),
    now: NOW,
  });
  recipient.setCareNeeds([], NOW);
  recipient.setHealthInformation(
    HealthInformation.create({
      medicalConditions: ["Alzheimer's Disease", 'Hypertension', 'Type 2 Diabetes'],
      needsMedicationHelp: false,
    }),
    [],
    NOW,
  );
  recipient.setSchedule(
    CareSchedule.create({
      frequency: 'DAILY',
      estimatedStartDate: new Date('2026-03-15'),
      expectedDuration: 'Ongoing',
    }),
    NOW,
  );
  recipient.finalize(NOW);
  recipient.setPriority(CareRecipientPriority.High, NOW);
  recipient.assignPrimaryCaregiver('cg-1', NOW);
  return recipient;
}

const readModel = {
  listPage: () => Promise.reject(new Error('unused')),
  counts: () => Promise.reject(new Error('unused')),
  recipientNumberById: () => Promise.resolve(1),
} as unknown as CareRecipientReadModel;

function user(id: string, fullName: string, phone: string, relationship: string | null): User {
  return {
    id,
    name: { fullName },
    phone: { value: phone },
    relationshipToRecipient: relationship,
  } as unknown as User;
}

const users: UserRepository = {
  save: () => Promise.resolve(),
  findById: () => Promise.resolve(null),
  findByIds: (ids: string[]) =>
    Promise.resolve(
      ids.map((id) =>
        id === 'owner-1'
          ? user('owner-1', 'Mark Williams', '(555) 234-5679', 'Husband')
          : user(id, 'Sarah Williams', '(555) 000-0000', null),
      ),
    ),
  findByEmail: () => Promise.resolve(null),
  existsByEmail: () => Promise.resolve(false),
  existsByPhone: () => Promise.resolve(false),
  countByType: () => Promise.resolve(0),
};

function recipientVisit(overrides: Parameters<typeof buildVisit>[0]): Visit {
  return buildVisit({ careRecipientId: RECIPIENT_ID, ...overrides });
}

const pastVisit = recipientVisit({
  id: 'v-past',
  caregiverId: 'cg-1',
  date: '2026-07-14',
  status: VisitStatus.Completed,
  startMinute: 570,
  endMinute: 810,
  clockInAt: new Date('2026-07-14T09:30:00.000Z'),
  clockOutAt: new Date('2026-07-14T13:30:00.000Z'),
  notes: [
    VisitNote.create({
      authorId: 'cg-1',
      audience: NoteAudience.Family,
      text: 'Margaret was in good spirits this morning.',
      createdAt: new Date('2026-07-14T13:30:00.000Z'),
    }),
  ],
});
const upcomingVisit = recipientVisit({
  id: 'v-next',
  caregiverId: 'cg-1',
  date: '2026-07-20',
  status: VisitStatus.Scheduled,
  startMinute: 840,
  endMinute: 900,
  specialInstructions: ['Afternoon Walk & Exercise'],
});

const visitsRepo: VisitRepository = {
  save: () => Promise.resolve(),
  findById: () => Promise.resolve(null),
  listForCaregiverInRange: () => Promise.resolve([]),
  listForCareRecipientsInRange: () => Promise.resolve([pastVisit, upcomingVisit]),
  listForDateRange: () => Promise.resolve([]),
};

const alert = OperationalAlert.raise({
  id: 'a1',
  type: AlertType.MedicationIssue,
  severity: AlertSeverity.High,
  title: 'Dosage discrepancy',
  description: 'Flagged',
  relatedCareRecipientId: RECIPIENT_ID,
  now: NOW,
});
const alertsRepo = {
  listOpen: () => Promise.resolve([alert]),
} as unknown as OperationalAlertRepository;

describe('GetCareRecipientProfileUseCase', () => {
  function make(repo: InMemoryCareRecipientRepository): GetCareRecipientProfileUseCase {
    return new GetCareRecipientProfileUseCase(
      repo,
      readModel,
      users,
      visitsRepo,
      alertsRepo,
      clock,
    );
  }

  it('assembles the profile overview', async () => {
    const repo = new InMemoryCareRecipientRepository();
    await repo.save(buildRecipient());
    const result = await make(repo).execute(RECIPIENT_ID);

    expect(result.header.code).toBe('CR-001');
    expect(result.header.primaryDiagnosis).toBe("Alzheimer's Disease");
    expect(result.header.careLevel).toBe('Full-Time');
    expect(result.header.priority).toBe('HIGH');

    expect(result.personalInformation.phone).toBeNull();
    expect(result.personalInformation.familyMember).toEqual({
      name: 'Mark Williams',
      relationship: 'Husband',
      phone: '(555) 234-5679',
    });

    expect(result.careSummary.secondaryDiagnoses).toEqual(['Hypertension', 'Type 2 Diabetes']);
    expect(result.careSummary.primaryCaregiverName).toBe('Sarah Williams');
    expect(result.careSummary.coordinatorName).toBeNull();
    expect(result.careSummary.nextScheduledVisitAt).toEqual(new Date('2026-07-20T14:00:00.000Z'));

    expect(result.quickStats.totalVisitsThisMonth).toBe(2);
    expect(result.quickStats.careHoursThisMonth).toBe(4);
    expect(result.quickStats.avgSatisfaction).toBeNull();
    expect(result.quickStats.activeCareAlerts).toBe(1);

    expect(result.careTeam).toEqual([
      { caregiverId: 'cg-1', name: 'Sarah Williams', role: 'Primary Caregiver', active: true },
    ]);
    expect(result.recentVisits.map((v) => v.id)).toEqual(['v-past']);
    expect(result.upcomingVisits[0].description).toBe('Afternoon Walk & Exercise');
    expect(result.latestNotes[0].text).toContain('good spirits');
  });

  it('raises not found for an unknown recipient', async () => {
    const repo = new InMemoryCareRecipientRepository();
    await expect(make(repo).execute('nope')).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});
