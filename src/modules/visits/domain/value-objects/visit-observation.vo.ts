import { ValidationException } from '@shared/domain/domain-exception';
import { ValueObject } from '@shared/domain/value-object.base';

interface VisitObservationProps {
  mood: string | null;
  appetite: string | null;
  mobility: string | null;
  medicationStatus: string | null;
}

const MAX_LENGTH = 120;

/**
 * The caregiver's qualitative observations for a visit: the recipient's mood,
 * appetite, mobility and whether medication was taken. Each is optional short
 * free text (for example "Good", "Ate well", "Walked with walker", "All taken").
 * A single observation record per visit, replaced when saved. This is health
 * related and must never be logged.
 */
export class VisitObservation extends ValueObject<VisitObservationProps> {
  private constructor(props: VisitObservationProps) {
    super(props);
  }

  public static empty(): VisitObservation {
    return new VisitObservation({
      mood: null,
      appetite: null,
      mobility: null,
      medicationStatus: null,
    });
  }

  public static create(params: {
    mood?: string | null;
    appetite?: string | null;
    mobility?: string | null;
    medicationStatus?: string | null;
  }): VisitObservation {
    return new VisitObservation({
      mood: VisitObservation.clean(params.mood, 'Mood'),
      appetite: VisitObservation.clean(params.appetite, 'Appetite'),
      mobility: VisitObservation.clean(params.mobility, 'Mobility'),
      medicationStatus: VisitObservation.clean(params.medicationStatus, 'Medication status'),
    });
  }

  private static clean(raw: string | null | undefined, label: string): string | null {
    if (raw === null || raw === undefined) {
      return null;
    }
    const value = raw.trim();
    if (value.length === 0) {
      return null;
    }
    if (value.length > MAX_LENGTH) {
      throw new ValidationException(`${label} exceeds the maximum length`);
    }
    return value;
  }

  /** Whether anything at all has been observed. */
  public get isEmpty(): boolean {
    return (
      this.props.mood === null &&
      this.props.appetite === null &&
      this.props.mobility === null &&
      this.props.medicationStatus === null
    );
  }

  public get mood(): string | null {
    return this.props.mood;
  }

  public get appetite(): string | null {
    return this.props.appetite;
  }

  public get mobility(): string | null {
    return this.props.mobility;
  }

  public get medicationStatus(): string | null {
    return this.props.medicationStatus;
  }
}
