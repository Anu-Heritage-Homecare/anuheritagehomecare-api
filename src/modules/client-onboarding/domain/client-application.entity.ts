import { CarePlanType } from '@modules/care-plans/domain/care-plan-type.enum';
import { AggregateRoot } from '@shared/domain/aggregate-root.base';
import { Currency } from '@shared/domain/currency.enum';
import { ValidationException } from '@shared/domain/domain-exception';
import { OnboardingPaymentStatus } from './onboarding-payment-status.enum';
import { OnboardingStage, stageOrder } from './onboarding-stage.enum';
import { OnboardingStatus } from './onboarding-status.enum';

/** One recorded entry into a funnel stage, used to time the pipeline. */
export interface StageEntry {
  stage: OnboardingStage;
  enteredAt: Date;
}

interface ClientApplicationProps {
  ownerId: string | null;
  careRecipientId: string | null;
  familyName: string;
  patientName: string;
  selectedPlanType: CarePlanType | null;
  currency: Currency;
  monthlyPriceMinor: number | null;
  paymentStatus: OnboardingPaymentStatus;
  coordinatorId: string | null;
  caregiverId: string | null;
  stage: OnboardingStage;
  status: OnboardingStatus;
  submittedAt: Date;
  activatedSubscriptionId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const MAX_NAME_LENGTH = 200;

/**
 * A client onboarding application: a family signing up a patient for a plan,
 * advancing through the lifecycle funnel from New Request to an activated
 * subscription. Stage progression is forward only and each entry into a stage is
 * recorded so the pipeline can report how long each stage takes. Construction goes
 * through the factory so the aggregate is never invalid.
 */
export class ClientApplication extends AggregateRoot<string> {
  private props: ClientApplicationProps;
  private readonly history: StageEntry[];
  private readonly pending: StageEntry[] = [];

  private constructor(id: string, props: ClientApplicationProps, history: StageEntry[]) {
    super(id);
    this.props = props;
    this.history = history;
  }

  public static open(params: {
    id: string;
    ownerId?: string | null;
    careRecipientId?: string | null;
    familyName: string;
    patientName: string;
    currency: Currency;
    now: Date;
  }): ClientApplication {
    const familyName = cleanName(params.familyName, 'A family name is required');
    const patientName = cleanName(params.patientName, 'A patient name is required');

    const application = new ClientApplication(
      params.id,
      {
        ownerId: params.ownerId ?? null,
        careRecipientId: params.careRecipientId ?? null,
        familyName,
        patientName,
        selectedPlanType: null,
        currency: params.currency,
        monthlyPriceMinor: null,
        paymentStatus: OnboardingPaymentStatus.Pending,
        coordinatorId: null,
        caregiverId: null,
        stage: OnboardingStage.NewRequest,
        status: OnboardingStatus.Pending,
        submittedAt: params.now,
        activatedSubscriptionId: null,
        createdAt: params.now,
        updatedAt: params.now,
      },
      [],
    );
    application.enterStage(OnboardingStage.NewRequest, params.now);
    return application;
  }

  public static rehydrate(
    id: string,
    props: ClientApplicationProps,
    history: StageEntry[],
  ): ClientApplication {
    return new ClientApplication(id, props, history);
  }

  /** Record the plan the family chose and its snapshotted monthly price. */
  public selectPlan(planType: CarePlanType, monthlyPriceMinor: number, now: Date): void {
    if (!Number.isInteger(monthlyPriceMinor) || monthlyPriceMinor < 0) {
      throw new ValidationException('The monthly price must be a non negative integer');
    }
    this.props.selectedPlanType = planType;
    this.props.monthlyPriceMinor = monthlyPriceMinor;
    this.advanceTo(OnboardingStage.PlanSelected, now);
  }

  /** Mark the first payment received. */
  public recordPayment(now: Date): void {
    this.props.paymentStatus = OnboardingPaymentStatus.Paid;
    this.advanceTo(OnboardingStage.PaymentReceived, now);
  }

  /** Submit the application into the verification queue. */
  public submitForReview(now: Date): void {
    this.props.status = OnboardingStatus.UnderReview;
    this.advanceTo(OnboardingStage.PendingReview, now);
  }

  /** Mark the documents verified. */
  public verifyDocuments(now: Date): void {
    this.props.status = OnboardingStatus.Approved;
    this.advanceTo(OnboardingStage.DocVerified, now);
  }

  /** Assign the coordinator who will own the case. */
  public assignCoordinator(coordinatorId: string, now: Date): void {
    if (coordinatorId.trim().length === 0) {
      throw new ValidationException('A coordinator is required');
    }
    this.props.coordinatorId = coordinatorId;
    this.advanceTo(OnboardingStage.CoordinatorAssigned, now);
  }

  /** Record that a caregiver has been scheduled. */
  public scheduleCaregiver(caregiverId: string, now: Date): void {
    if (caregiverId.trim().length === 0) {
      throw new ValidationException('A caregiver is required');
    }
    this.props.caregiverId = caregiverId;
    this.advanceTo(OnboardingStage.CaregiverScheduled, now);
  }

  /** Complete onboarding: the subscription is live. */
  public activate(subscriptionId: string, now: Date): void {
    if (subscriptionId.trim().length === 0) {
      throw new ValidationException('An activated subscription is required');
    }
    this.props.activatedSubscriptionId = subscriptionId;
    this.props.status = OnboardingStatus.Approved;
    this.advanceTo(OnboardingStage.SubActivated, now);
  }

  /** Set the verification status without moving the funnel stage. */
  public setStatus(status: OnboardingStatus, now: Date): void {
    this.props.status = status;
    this.props.updatedAt = now;
  }

  private advanceTo(stage: OnboardingStage, now: Date): void {
    if (stageOrder(stage) < stageOrder(this.props.stage)) {
      throw new ValidationException('An onboarding application cannot move backwards');
    }
    if (stage !== this.props.stage) {
      this.props.stage = stage;
      this.enterStage(stage, now);
    }
    this.props.updatedAt = now;
  }

  private enterStage(stage: OnboardingStage, now: Date): void {
    const entry: StageEntry = { stage, enteredAt: now };
    this.history.push(entry);
    this.pending.push(entry);
  }

  /** Stage entries recorded since the aggregate was loaded, for persistence. */
  public pullPendingStageEntries(): StageEntry[] {
    const entries = [...this.pending];
    this.pending.length = 0;
    return entries;
  }

  public get stageHistory(): StageEntry[] {
    return [...this.history];
  }

  public get ownerId(): string | null {
    return this.props.ownerId;
  }

  public get careRecipientId(): string | null {
    return this.props.careRecipientId;
  }

  public get familyName(): string {
    return this.props.familyName;
  }

  public get patientName(): string {
    return this.props.patientName;
  }

  public get selectedPlanType(): CarePlanType | null {
    return this.props.selectedPlanType;
  }

  public get currency(): Currency {
    return this.props.currency;
  }

  public get monthlyPriceMinor(): number | null {
    return this.props.monthlyPriceMinor;
  }

  public get paymentStatus(): OnboardingPaymentStatus {
    return this.props.paymentStatus;
  }

  public get coordinatorId(): string | null {
    return this.props.coordinatorId;
  }

  public get caregiverId(): string | null {
    return this.props.caregiverId;
  }

  public get stage(): OnboardingStage {
    return this.props.stage;
  }

  public get status(): OnboardingStatus {
    return this.props.status;
  }

  public get submittedAt(): Date {
    return this.props.submittedAt;
  }

  public get activatedSubscriptionId(): string | null {
    return this.props.activatedSubscriptionId;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }

  public get updatedAt(): Date {
    return this.props.updatedAt;
  }
}

function cleanName(raw: string, message: string): string {
  const name = raw.trim();
  if (name.length === 0) {
    throw new ValidationException(message);
  }
  if (name.length > MAX_NAME_LENGTH) {
    throw new ValidationException('The name exceeds the maximum length');
  }
  return name;
}
