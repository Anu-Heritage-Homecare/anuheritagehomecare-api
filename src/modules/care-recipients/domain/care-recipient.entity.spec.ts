import { ValidationException } from '@shared/domain/domain-exception';
import { buildProfile } from '../test-support/doubles';
import { CareRecipient } from './care-recipient.entity';
import { CareNeed } from './care-need.enum';
import { CareRecipientStatus } from './care-recipient-status.enum';
import { OnboardingStep } from './onboarding-step.enum';
import { Medication } from './medication.entity';
import { CareSchedule } from './value-objects/care-schedule.vo';
import { HealthInformation } from './value-objects/health-information.vo';

const NOW = new Date('2026-01-01T00:00:00.000Z');

function draft(): CareRecipient {
  return CareRecipient.startDraft({
    id: 'care-1',
    ownerId: 'owner-1',
    profile: buildProfile(),
    now: NOW,
  });
}

const schedule = (): CareSchedule =>
  CareSchedule.create({
    frequency: 'WEEKLY',
    estimatedStartDate: new Date('2026-08-20'),
    expectedDuration: '3 to 6 months',
  });

describe('CareRecipient', () => {
  it('starts a draft pointing at the care needs step', () => {
    const recipient = draft();

    expect(recipient.status).toBe(CareRecipientStatus.Draft);
    expect(recipient.onboardingStep).toBe(OnboardingStep.CareNeeds);
    expect(recipient.domainEvents).toHaveLength(1);
  });

  it('advances the resume pointer as steps are saved', () => {
    const recipient = draft();

    recipient.setCareNeeds([CareNeed.Bathing, CareNeed.Bathing], NOW);
    expect(recipient.careNeeds).toEqual([CareNeed.Bathing]);
    expect(recipient.onboardingStep).toBe(OnboardingStep.Health);

    recipient.setHealthInformation(
      HealthInformation.create({ needsMedicationHelp: false }),
      [],
      NOW,
    );
    expect(recipient.onboardingStep).toBe(OnboardingStep.Schedule);

    recipient.setSchedule(schedule(), NOW);
    expect(recipient.onboardingStep).toBe(OnboardingStep.Review);
  });

  it('records the medication schedule alongside the health information', () => {
    const recipient = draft();
    recipient.setCareNeeds([CareNeed.Bathing], NOW);

    const metformin = Medication.create({ id: 'med-1', name: 'Metformin', dose: '500 mg' });
    recipient.setHealthInformation(
      HealthInformation.create({ needsMedicationHelp: true }),
      [metformin],
      NOW,
    );

    expect(recipient.medications).toHaveLength(1);
    expect(recipient.medications[0].name).toBe('Metformin');
  });

  it('rejects medications when no medication help is needed', () => {
    const recipient = draft();
    const metformin = Medication.create({ id: 'med-1', name: 'Metformin' });

    expect(() =>
      recipient.setHealthInformation(
        HealthInformation.create({ needsMedicationHelp: false }),
        [metformin],
        NOW,
      ),
    ).toThrow(ValidationException);
  });

  it('does not regress the pointer when an earlier step is re-edited', () => {
    const recipient = draft();
    recipient.setCareNeeds([CareNeed.Bathing], NOW);
    recipient.setHealthInformation(
      HealthInformation.create({ needsMedicationHelp: false }),
      [],
      NOW,
    );

    recipient.setCareNeeds([CareNeed.Dressing], NOW);

    expect(recipient.onboardingStep).toBe(OnboardingStep.Schedule);
  });

  it('refuses to finalise before the schedule is set', () => {
    const recipient = draft();
    expect(() => recipient.finalize(NOW)).toThrow(ValidationException);
  });

  it('finalises once the schedule is set and then locks editing', () => {
    const recipient = draft();
    recipient.setSchedule(schedule(), NOW);
    recipient.clearDomainEvents();

    recipient.finalize(NOW);

    expect(recipient.status).toBe(CareRecipientStatus.Active);
    expect(recipient.onboardingStep).toBe(OnboardingStep.Completed);
    expect(recipient.completedAt).toEqual(NOW);
    expect(recipient.domainEvents).toHaveLength(1);
    expect(() => recipient.setCareNeeds([CareNeed.Shopping], NOW)).toThrow(ValidationException);
  });
});
