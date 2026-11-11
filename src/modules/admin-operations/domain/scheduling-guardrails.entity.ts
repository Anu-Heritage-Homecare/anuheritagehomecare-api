import { AggregateRoot } from '@shared/domain/aggregate-root.base';
import { ValidationException } from '@shared/domain/domain-exception';
import { AutoAssignAlgorithm } from './auto-assign-algorithm.enum';

interface GuardrailsProps {
  minimumNoticeHours: number;
  travelBufferMinutes: number;
  maxVisitsPerCaregiverPerDay: number;
  autoAssignAlgorithm: AutoAssignAlgorithm;
  createdAt: Date;
  updatedAt: Date;
}

/** The single set of scheduling constraints applied when visits are created and assigned. */
export class SchedulingGuardrails extends AggregateRoot<string> {
  private props: GuardrailsProps;

  private constructor(id: string, props: GuardrailsProps) {
    super(id);
    this.props = props;
  }

  /** The default guardrails, shown before any are saved. */
  public static defaults(id: string, now: Date): SchedulingGuardrails {
    return new SchedulingGuardrails(id, {
      minimumNoticeHours: 24,
      travelBufferMinutes: 30,
      maxVisitsPerCaregiverPerDay: 6,
      autoAssignAlgorithm: AutoAssignAlgorithm.ProximityAndSkills,
      createdAt: now,
      updatedAt: now,
    });
  }

  public static rehydrate(id: string, props: GuardrailsProps): SchedulingGuardrails {
    return new SchedulingGuardrails(id, props);
  }

  public edit(
    fields: {
      minimumNoticeHours?: number;
      travelBufferMinutes?: number;
      maxVisitsPerCaregiverPerDay?: number;
      autoAssignAlgorithm?: AutoAssignAlgorithm;
    },
    now: Date,
  ): void {
    if (fields.minimumNoticeHours !== undefined) {
      this.props.minimumNoticeHours = SchedulingGuardrails.nonNegative(
        fields.minimumNoticeHours,
        'Minimum notice period',
      );
    }
    if (fields.travelBufferMinutes !== undefined) {
      this.props.travelBufferMinutes = SchedulingGuardrails.nonNegative(
        fields.travelBufferMinutes,
        'Travel buffer',
      );
    }
    if (fields.maxVisitsPerCaregiverPerDay !== undefined) {
      this.props.maxVisitsPerCaregiverPerDay = SchedulingGuardrails.positive(
        fields.maxVisitsPerCaregiverPerDay,
        'Maximum visits per caregiver per day',
      );
    }
    if (fields.autoAssignAlgorithm !== undefined) {
      this.props.autoAssignAlgorithm = fields.autoAssignAlgorithm;
    }
    this.props.updatedAt = now;
  }

  private static nonNegative(value: number, label: string): number {
    if (!Number.isInteger(value) || value < 0) {
      throw new ValidationException(`${label} must be a non negative whole number`);
    }
    return value;
  }

  private static positive(value: number, label: string): number {
    if (!Number.isInteger(value) || value <= 0) {
      throw new ValidationException(`${label} must be a positive whole number`);
    }
    return value;
  }

  public get minimumNoticeHours(): number {
    return this.props.minimumNoticeHours;
  }

  public get travelBufferMinutes(): number {
    return this.props.travelBufferMinutes;
  }

  public get maxVisitsPerCaregiverPerDay(): number {
    return this.props.maxVisitsPerCaregiverPerDay;
  }

  public get autoAssignAlgorithm(): AutoAssignAlgorithm {
    return this.props.autoAssignAlgorithm;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }

  public get updatedAt(): Date {
    return this.props.updatedAt;
  }
}
