import { AggregateRoot } from '@shared/domain/aggregate-root.base';
import { ValidationException } from '@shared/domain/domain-exception';
import { CareNeed } from './care-need.enum';
import { CareRecipientStatus } from './care-recipient-status.enum';
import { CareRecipientCompletedEvent } from './events/care-recipient-completed.event';
import { CareRecipientDraftedEvent } from './events/care-recipient-drafted.event';
import { Medication } from './medication.entity';
import { OnboardingStep, furthestStep } from './onboarding-step.enum';
import { CareSchedule } from './value-objects/care-schedule.vo';
import { HealthInformation } from './value-objects/health-information.vo';
import { RecipientProfile } from './value-objects/recipient-profile.vo';

interface CareRecipientProps {
  ownerId: string;
  status: CareRecipientStatus;
  onboardingStep: OnboardingStep;
  profile: RecipientProfile;
  careNeeds: CareNeed[];
  health: HealthInformation | null;
  medications: Medication[];
  schedule: CareSchedule | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * CareRecipient aggregate root: the digital identity of a loved one a family
 * owner onboards for care visits.
 *
 * The record is built through a multi step wizard. `startDraft` creates it with
 * the identity profile; the remaining steps are recorded through intention
 * revealing methods. `finalize` enforces that the required steps are complete
 * before the record becomes active. All state changes go through this root so
 * invariants live in one place and the aggregate is never in an invalid state.
 */
export class CareRecipient extends AggregateRoot<string> {
  private props: CareRecipientProps;

  private constructor(id: string, props: CareRecipientProps) {
    super(id);
    this.props = props;
  }

  /** Start a new onboarding draft owned by a family owner. */
  public static startDraft(params: {
    id: string;
    ownerId: string;
    profile: RecipientProfile;
    now: Date;
  }): CareRecipient {
    const recipient = new CareRecipient(params.id, {
      ownerId: params.ownerId,
      status: CareRecipientStatus.Draft,
      onboardingStep: OnboardingStep.CareNeeds,
      profile: params.profile,
      careNeeds: [],
      health: null,
      medications: [],
      schedule: null,
      completedAt: null,
      createdAt: params.now,
      updatedAt: params.now,
    });
    recipient.addDomainEvent(new CareRecipientDraftedEvent(params.id, params.ownerId));
    return recipient;
  }

  /** Rehydrate an existing aggregate from persistence without emitting events. */
  public static rehydrate(id: string, props: CareRecipientProps): CareRecipient {
    return new CareRecipient(id, props);
  }

  private assertMutable(): void {
    if (this.props.status !== CareRecipientStatus.Draft) {
      throw new ValidationException('A finalised care recipient can no longer be edited');
    }
  }

  /** Replace the identity profile captured on step one. */
  public updateProfile(profile: RecipientProfile, now: Date): void {
    this.assertMutable();
    this.props.profile = profile;
    this.props.updatedAt = now;
  }

  /** Record the selected care needs (step two). Duplicates are collapsed. */
  public setCareNeeds(needs: CareNeed[], now: Date): void {
    this.assertMutable();
    this.props.careNeeds = [...new Set(needs)];
    this.advanceStep(OnboardingStep.Health);
    this.props.updatedAt = now;
  }

  /**
   * Record health information and the medication schedule (step three). The two
   * are set together so the invariant between them holds: medications can only be
   * listed when the family has said medication help is needed.
   */
  public setHealthInformation(
    health: HealthInformation,
    medications: Medication[],
    now: Date,
  ): void {
    this.assertMutable();
    if (!health.needsMedicationHelp && medications.length > 0) {
      throw new ValidationException(
        'Medications cannot be listed when no medication help is needed',
      );
    }
    this.props.health = health;
    this.props.medications = [...medications];
    this.advanceStep(OnboardingStep.Schedule);
    this.props.updatedAt = now;
  }

  /** Record the care schedule (step four). */
  public setSchedule(schedule: CareSchedule, now: Date): void {
    this.assertMutable();
    this.props.schedule = schedule;
    this.advanceStep(OnboardingStep.Review);
    this.props.updatedAt = now;
  }

  /**
   * Revise the care schedule of an already onboarded recipient. Unlike the
   * onboarding step this is permitted after the record is active (a family owner
   * adjusting their plan) and does not move the onboarding pointer. A schedule must
   * already exist, so the recipient has been through onboarding.
   */
  public reviseSchedule(schedule: CareSchedule, now: Date): void {
    if (this.props.schedule === null) {
      throw new ValidationException('The care schedule has not been set up yet');
    }
    this.props.schedule = schedule;
    this.props.updatedAt = now;
  }

  /** Move the resume pointer forward, never backward. */
  private advanceStep(step: OnboardingStep): void {
    this.props.onboardingStep = furthestStep(this.props.onboardingStep, step);
  }

  /**
   * Finalise onboarding. The identity profile is always present; a care schedule
   * is required before the record can go active. Care needs and health
   * information are optional. Finalising an already active record is a no-op.
   */
  public finalize(now: Date): void {
    if (this.props.status === CareRecipientStatus.Active) {
      return;
    }
    if (this.props.schedule === null) {
      throw new ValidationException(
        'The care schedule must be completed before finalising onboarding',
      );
    }
    this.props.status = CareRecipientStatus.Active;
    this.props.onboardingStep = OnboardingStep.Completed;
    this.props.completedAt = now;
    this.props.updatedAt = now;
    this.addDomainEvent(new CareRecipientCompletedEvent(this.id, this.props.ownerId));
  }

  public get ownerId(): string {
    return this.props.ownerId;
  }

  public get status(): CareRecipientStatus {
    return this.props.status;
  }

  public get onboardingStep(): OnboardingStep {
    return this.props.onboardingStep;
  }

  public get profile(): RecipientProfile {
    return this.props.profile;
  }

  public get careNeeds(): CareNeed[] {
    return [...this.props.careNeeds];
  }

  public get health(): HealthInformation | null {
    return this.props.health;
  }

  public get medications(): Medication[] {
    return [...this.props.medications];
  }

  public get schedule(): CareSchedule | null {
    return this.props.schedule;
  }

  public get completedAt(): Date | null {
    return this.props.completedAt;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }

  public get updatedAt(): Date {
    return this.props.updatedAt;
  }
}
