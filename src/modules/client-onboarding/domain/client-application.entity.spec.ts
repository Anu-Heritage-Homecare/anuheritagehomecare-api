import { CarePlanType } from '@modules/care-plans/domain/care-plan-type.enum';
import { Currency } from '@shared/domain/currency.enum';
import { ValidationException } from '@shared/domain/domain-exception';
import { ClientApplication } from './client-application.entity';
import { OnboardingPaymentStatus } from './onboarding-payment-status.enum';
import { OnboardingStage } from './onboarding-stage.enum';
import { OnboardingStatus } from './onboarding-status.enum';

const T0 = new Date('2026-09-16T09:00:00.000Z');
const T1 = new Date('2026-09-16T10:00:00.000Z');
const T2 = new Date('2026-09-17T09:00:00.000Z');

function open(): ClientApplication {
  return ClientApplication.open({
    id: 'app-1',
    familyName: '  Adeyemi Family  ',
    patientName: 'Folake Adeyemi',
    currency: Currency.NigerianNaira,
    now: T0,
  });
}

describe('ClientApplication', () => {
  it('opens at New Request, pending, unpaid, and records the first stage entry', () => {
    const application = open();
    expect(application.stage).toBe(OnboardingStage.NewRequest);
    expect(application.status).toBe(OnboardingStatus.Pending);
    expect(application.paymentStatus).toBe(OnboardingPaymentStatus.Pending);
    expect(application.familyName).toBe('Adeyemi Family');
    expect(application.stageHistory).toHaveLength(1);
    expect(application.stageHistory[0].stage).toBe(OnboardingStage.NewRequest);
  });

  it('advances forward through the funnel, snapshotting plan and price', () => {
    const application = open();
    application.selectPlan(CarePlanType.Premium, 95_700, T1);
    expect(application.stage).toBe(OnboardingStage.PlanSelected);
    expect(application.selectedPlanType).toBe(CarePlanType.Premium);
    expect(application.monthlyPriceMinor).toBe(95_700);

    application.recordPayment(T1);
    expect(application.paymentStatus).toBe(OnboardingPaymentStatus.Paid);
    application.submitForReview(T1);
    expect(application.status).toBe(OnboardingStatus.UnderReview);
    application.verifyDocuments(T1);
    application.assignCoordinator('coord-1', T1);
    expect(application.coordinatorId).toBe('coord-1');
    application.scheduleCaregiver('cg-1', T1);
    application.activate('sub-1', T2);
    expect(application.stage).toBe(OnboardingStage.SubActivated);
    expect(application.activatedSubscriptionId).toBe('sub-1');
    // Eight distinct stages entered.
    expect(application.stageHistory).toHaveLength(8);
  });

  it('records only new stage entries as pending for persistence', () => {
    const application = open();
    expect(application.pullPendingStageEntries()).toHaveLength(1);
    expect(application.pullPendingStageEntries()).toHaveLength(0);
    application.selectPlan(CarePlanType.StandardMonthly, 124_500, T1);
    expect(application.pullPendingStageEntries()).toHaveLength(1);
  });

  it('rejects moving backwards in the funnel', () => {
    const application = open();
    application.selectPlan(CarePlanType.Premium, 95_700, T1);
    application.recordPayment(T1);
    // recordPayment again would target an earlier stage than the current one.
    expect(() => application.selectPlan(CarePlanType.Premium, 95_700, T1)).toThrow(
      ValidationException,
    );
  });

  it('sets the verification status without moving the stage', () => {
    const application = open();
    application.setStatus(OnboardingStatus.NeedsInfo, T1);
    expect(application.status).toBe(OnboardingStatus.NeedsInfo);
    expect(application.stage).toBe(OnboardingStage.NewRequest);
  });
});
