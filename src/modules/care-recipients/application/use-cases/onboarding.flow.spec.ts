import { NotFoundDomainException, ValidationException } from '@shared/domain/domain-exception';
import { CareRecipientStatus } from '../../domain/care-recipient-status.enum';
import { OnboardingStep } from '../../domain/onboarding-step.enum';
import {
  InMemoryCareRecipientRepository,
  fixedClock,
  sequentialIds,
} from '../../test-support/doubles';
import { CreateCareRecipientDraftCommand } from '../commands/create-care-recipient-draft.command';
import { CreateCareRecipientDraftUseCase } from './create-care-recipient-draft.use-case';
import { FinalizeCareRecipientUseCase } from './finalize-care-recipient.use-case';
import { GetCareRecipientUseCase } from './get-care-recipient.use-case';
import { UpdateCareNeedsUseCase } from './update-care-needs.use-case';
import { UpdateCareScheduleUseCase } from './update-care-schedule.use-case';
import { UpdateHealthInformationUseCase } from './update-health-information.use-case';

describe('Care recipient onboarding flow', () => {
  let repo: InMemoryCareRecipientRepository;
  let create: CreateCareRecipientDraftUseCase;
  let needs: UpdateCareNeedsUseCase;
  let health: UpdateHealthInformationUseCase;
  let schedule: UpdateCareScheduleUseCase;
  let finalize: FinalizeCareRecipientUseCase;
  let get: GetCareRecipientUseCase;

  const draftCommand: CreateCareRecipientDraftCommand = {
    ownerId: 'owner-1',
    name: 'Grace Okafor',
    gender: 'FEMALE',
    dateOfBirth: '1950-04-20',
    city: 'Lagos',
    state: 'Lagos State',
    fullAddress: 'No 4 Okeowoyomi street',
    relationship: 'Parent',
    livingSituation: 'Lives with family',
  };

  beforeEach(() => {
    repo = new InMemoryCareRecipientRepository();
    create = new CreateCareRecipientDraftUseCase(repo, fixedClock, sequentialIds());
    needs = new UpdateCareNeedsUseCase(repo, fixedClock);
    health = new UpdateHealthInformationUseCase(repo, fixedClock, sequentialIds('med'));
    schedule = new UpdateCareScheduleUseCase(repo, fixedClock);
    finalize = new FinalizeCareRecipientUseCase(repo, fixedClock);
    get = new GetCareRecipientUseCase(repo);
  });

  it('walks the wizard end to end and activates the record', async () => {
    const created = await create.execute(draftCommand);
    expect(created.status).toBe(CareRecipientStatus.Draft);
    expect(created.nextStep).toBe(OnboardingStep.CareNeeds);
    const id = created.id;

    await needs.execute({ ownerId: 'owner-1', careRecipientId: id, careNeeds: ['BATHING'] });
    await health.execute({
      ownerId: 'owner-1',
      careRecipientId: id,
      needsMedicationHelp: true,
      medications: [{ name: 'Metformin', dose: '500 mg', scheduleMinute: 510 }],
    });
    const scheduled = await schedule.execute({
      ownerId: 'owner-1',
      careRecipientId: id,
      frequency: 'WEEKLY',
      estimatedStartDate: '2026-08-20',
      expectedDuration: '3 to 6 months',
    });
    expect(scheduled.nextStep).toBe(OnboardingStep.Review);

    const done = await finalize.execute({ ownerId: 'owner-1', careRecipientId: id });
    expect(done.status).toBe(CareRecipientStatus.Active);
    expect(done.nextStep).toBe(OnboardingStep.Completed);
    expect(done.health?.medications).toEqual([
      { id: 'med-1', name: 'Metformin', dose: '500 mg', scheduleMinute: 510 },
    ]);
    expect(done.schedule?.estimatedStartDate).toBe('2026-08-20');
  });

  it('lets a returning owner resume from the persisted step', async () => {
    const created = await create.execute(draftCommand);
    await needs.execute({ ownerId: 'owner-1', careRecipientId: created.id, careNeeds: [] });

    const resumed = await get.execute({ ownerId: 'owner-1', careRecipientId: created.id });
    expect(resumed.nextStep).toBe(OnboardingStep.Health);
  });

  it('hides one owner records from another owner', async () => {
    const created = await create.execute(draftCommand);

    await expect(
      get.execute({ ownerId: 'intruder', careRecipientId: created.id }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
    await expect(
      needs.execute({ ownerId: 'intruder', careRecipientId: created.id, careNeeds: ['BATHING'] }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });

  it('rejects an estimated start date in the past', async () => {
    const created = await create.execute(draftCommand);

    await expect(
      schedule.execute({
        ownerId: 'owner-1',
        careRecipientId: created.id,
        frequency: 'DAILY',
        estimatedStartDate: '2020-01-01',
        expectedDuration: 'Ongoing',
      }),
    ).rejects.toBeInstanceOf(ValidationException);
  });

  it('refuses to finalise before the schedule step', async () => {
    const created = await create.execute(draftCommand);

    await expect(
      finalize.execute({ ownerId: 'owner-1', careRecipientId: created.id }),
    ).rejects.toBeInstanceOf(ValidationException);
  });
});
