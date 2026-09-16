import { CarePlanType } from '@modules/care-plans/domain/care-plan-type.enum';
import { AggregateRoot } from '@shared/domain/aggregate-root.base';
import { Currency } from '@shared/domain/currency.enum';
import { ValidationException } from '@shared/domain/domain-exception';
import { DocsStatus } from './docs-status.enum';
import { OnboardingPaymentStatus } from './onboarding-payment-status.enum';
import { OnboardingPriority } from './onboarding-priority.enum';
import { OnboardingStage, stageOrder } from './onboarding-stage.enum';
import { OnboardingStatus } from './onboarding-status.enum';

/** One recorded entry into a funnel stage, used to time the pipeline. */
export interface StageEntry {
  stage: OnboardingStage;
  enteredAt: Date;
}

/** An uploaded document (opaque storage key). */
export interface DocumentEntry {
  label: string;
  key: string;
}

/** Intake snapshot and request specific detail captured when an application opens. */
export interface ClientApplicationIntake {
  patientDateOfBirth?: Date | null;
  patientGender?: string | null;
  patientConditions?: string[];
  contactName?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  contactAddress?: string | null;
  requestedHoursPerWeek?: number | null;
  requestedSchedule?: string | null;
  specialNeeds?: string | null;
  documents?: DocumentEntry[];
}

interface ClientApplicationProps {
  ownerId: string | null;
  careRecipientId: string | null;
  familyName: string;
  patientName: string;
  selectedPlanType: CarePlanType | null;
  currency: Currency;
  monthlyPriceMinor: number | null;
  priority: OnboardingPriority;
  paymentStatus: OnboardingPaymentStatus;
  docsStatus: DocsStatus;
  coordinatorId: string | null;
  caregiverId: string | null;
  stage: OnboardingStage;
  status: OnboardingStatus;
  submittedAt: Date;
  activatedSubscriptionId: string | null;
  patientDateOfBirth: Date | null;
  patientGender: string | null;
  patientConditions: string[];
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  contactAddress: string | null;
  requestedHoursPerWeek: number | null;
  requestedSchedule: string | null;
  specialNeeds: string | null;
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
  private readonly documents: DocumentEntry[];
  private readonly pendingDocuments: DocumentEntry[] = [];

  private constructor(
    id: string,
    props: ClientApplicationProps,
    history: StageEntry[],
    documents: DocumentEntry[],
  ) {
    super(id);
    this.props = props;
    this.history = history;
    this.documents = documents;
  }

  public static open(params: {
    id: string;
    ownerId?: string | null;
    careRecipientId?: string | null;
    familyName: string;
    patientName: string;
    currency: Currency;
    priority?: OnboardingPriority;
    intake?: ClientApplicationIntake;
    now: Date;
  }): ClientApplication {
    const familyName = cleanName(params.familyName, 'A family name is required');
    const patientName = cleanName(params.patientName, 'A patient name is required');
    const intake = params.intake ?? {};

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
        priority: params.priority ?? OnboardingPriority.Medium,
        paymentStatus: OnboardingPaymentStatus.Pending,
        docsStatus: DocsStatus.Missing,
        coordinatorId: null,
        caregiverId: null,
        stage: OnboardingStage.NewRequest,
        status: OnboardingStatus.Pending,
        submittedAt: params.now,
        activatedSubscriptionId: null,
        patientDateOfBirth: intake.patientDateOfBirth ?? null,
        patientGender: intake.patientGender ?? null,
        patientConditions: intake.patientConditions ?? [],
        contactName: intake.contactName ?? null,
        contactPhone: intake.contactPhone ?? null,
        contactEmail: intake.contactEmail ?? null,
        contactAddress: intake.contactAddress ?? null,
        requestedHoursPerWeek: intake.requestedHoursPerWeek ?? null,
        requestedSchedule: intake.requestedSchedule ?? null,
        specialNeeds: intake.specialNeeds ?? null,
        createdAt: params.now,
        updatedAt: params.now,
      },
      [],
      [],
    );
    application.enterStage(OnboardingStage.NewRequest, params.now);
    for (const document of intake.documents ?? []) {
      application.attachDocument(document.label, document.key, params.now);
    }
    return application;
  }

  public static rehydrate(
    id: string,
    props: ClientApplicationProps,
    history: StageEntry[],
    documents: DocumentEntry[],
  ): ClientApplication {
    return new ClientApplication(id, props, history, documents);
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

  /** Record that the first payment attempt failed, without moving the stage. */
  public failPayment(now: Date): void {
    this.props.paymentStatus = OnboardingPaymentStatus.Failed;
    this.props.updatedAt = now;
  }

  /** Set the triage priority. */
  public setPriority(priority: OnboardingPriority, now: Date): void {
    this.props.priority = priority;
    this.props.updatedAt = now;
  }

  /** Set the document completeness state. */
  public setDocsStatus(docsStatus: DocsStatus, now: Date): void {
    this.props.docsStatus = docsStatus;
    this.props.updatedAt = now;
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

  /** Attach an uploaded document (opaque storage key). */
  public attachDocument(label: string, key: string, now: Date): void {
    const cleanLabel = label.trim();
    const cleanKey = key.trim();
    if (cleanLabel.length === 0 || cleanKey.length === 0) {
      throw new ValidationException('A document needs a label and a key');
    }
    const document: DocumentEntry = { label: cleanLabel, key: cleanKey };
    this.documents.push(document);
    this.pendingDocuments.push(document);
    this.props.updatedAt = now;
  }

  /** Stage entries recorded since the aggregate was loaded, for persistence. */
  public pullPendingStageEntries(): StageEntry[] {
    const entries = [...this.pending];
    this.pending.length = 0;
    return entries;
  }

  /** Documents attached since the aggregate was loaded, for persistence. */
  public pullPendingDocuments(): DocumentEntry[] {
    const documents = [...this.pendingDocuments];
    this.pendingDocuments.length = 0;
    return documents;
  }

  public get stageHistory(): StageEntry[] {
    return [...this.history];
  }

  public get uploadedDocuments(): DocumentEntry[] {
    return [...this.documents];
  }

  public get patientDateOfBirth(): Date | null {
    return this.props.patientDateOfBirth;
  }

  public get patientGender(): string | null {
    return this.props.patientGender;
  }

  public get patientConditions(): string[] {
    return [...this.props.patientConditions];
  }

  public get contactName(): string | null {
    return this.props.contactName;
  }

  public get contactPhone(): string | null {
    return this.props.contactPhone;
  }

  public get contactEmail(): string | null {
    return this.props.contactEmail;
  }

  public get contactAddress(): string | null {
    return this.props.contactAddress;
  }

  public get requestedHoursPerWeek(): number | null {
    return this.props.requestedHoursPerWeek;
  }

  public get requestedSchedule(): string | null {
    return this.props.requestedSchedule;
  }

  public get specialNeeds(): string | null {
    return this.props.specialNeeds;
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

  public get priority(): OnboardingPriority {
    return this.props.priority;
  }

  public get paymentStatus(): OnboardingPaymentStatus {
    return this.props.paymentStatus;
  }

  public get docsStatus(): DocsStatus {
    return this.props.docsStatus;
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
