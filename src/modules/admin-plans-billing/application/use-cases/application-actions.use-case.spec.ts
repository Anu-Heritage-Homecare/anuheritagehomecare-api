import { ClientApplication } from '@modules/client-onboarding/domain/client-application.entity';
import { ClientApplicationRepository } from '@modules/client-onboarding/domain/client-application.repository';
import { OnboardingStage } from '@modules/client-onboarding/domain/onboarding-stage.enum';
import { OnboardingStatus } from '@modules/client-onboarding/domain/onboarding-status.enum';
import { Currency } from '@shared/domain/currency.enum';
import { NotFoundDomainException, ValidationException } from '@shared/domain/domain-exception';
import { AdvanceApplicationStageUseCase } from './advance-application-stage.use-case';
import { AssignApplicationCoordinatorUseCase } from './assign-application-coordinator.use-case';
import { SetApplicationStatusUseCase } from './set-application-status.use-case';

const NOW = new Date('2026-09-16T12:00:00.000Z');
const clock = { now: () => NOW };

function application(): ClientApplication {
  return ClientApplication.open({
    id: 'app-1',
    familyName: 'Adeyemi Family',
    patientName: 'Folake Adeyemi',
    currency: Currency.UnitedStatesDollar,
    now: new Date('2026-09-10T09:00:00.000Z'),
  });
}

function repo(
  app: ClientApplication | null,
): ClientApplicationRepository & { saved: ClientApplication[] } {
  const saved: ClientApplication[] = [];
  return {
    saved,
    findById: () => Promise.resolve(app),
    save: (a) => {
      saved.push(a);
      return Promise.resolve();
    },
  };
}

describe('AssignApplicationCoordinatorUseCase', () => {
  it('assigns the coordinator and advances the stage', async () => {
    const app = application();
    const store = repo(app);
    await new AssignApplicationCoordinatorUseCase(store, clock).execute({
      applicationId: 'app-1',
      coordinatorId: 'coord-1',
    });
    expect(app.coordinatorId).toBe('coord-1');
    expect(app.stage).toBe(OnboardingStage.CoordinatorAssigned);
    expect(store.saved).toHaveLength(1);
  });

  it('rejects an unknown application', async () => {
    await expect(
      new AssignApplicationCoordinatorUseCase(repo(null), clock).execute({
        applicationId: 'nope',
        coordinatorId: 'coord-1',
      }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});

describe('SetApplicationStatusUseCase', () => {
  it('sets the verification status without moving the stage', async () => {
    const app = application();
    const store = repo(app);
    await new SetApplicationStatusUseCase(store, clock).execute({
      applicationId: 'app-1',
      status: 'NEEDS_INFO',
    });
    expect(app.status).toBe(OnboardingStatus.NeedsInfo);
    expect(app.stage).toBe(OnboardingStage.NewRequest);
  });

  it('rejects an unknown status', async () => {
    await expect(
      new SetApplicationStatusUseCase(repo(application()), clock).execute({
        applicationId: 'app-1',
        status: 'BOGUS',
      }),
    ).rejects.toBeInstanceOf(ValidationException);
  });
});

describe('AdvanceApplicationStageUseCase', () => {
  it('records payment on the plain transition', async () => {
    const app = application();
    const store = repo(app);
    await new AdvanceApplicationStageUseCase(store, clock).execute({
      applicationId: 'app-1',
      transition: 'RECORD_PAYMENT',
      caregiverId: null,
    });
    expect(app.stage).toBe(OnboardingStage.PaymentReceived);
  });

  it('requires a caregiver when scheduling', async () => {
    await expect(
      new AdvanceApplicationStageUseCase(repo(application()), clock).execute({
        applicationId: 'app-1',
        transition: 'SCHEDULE_CAREGIVER',
        caregiverId: null,
      }),
    ).rejects.toBeInstanceOf(ValidationException);
  });
});
