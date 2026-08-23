import { ValidationException } from '@shared/domain/domain-exception';
import { ValueObject } from '@shared/domain/value-object.base';

interface VisitBreakProps {
  startedAt: Date;
  endedAt: Date | null;
}

/**
 * One break a caregiver takes during a visit, as a time interval. It is opened
 * when the break begins (`endedAt` null) and closed when it ends. Immutable: both
 * transitions produce a new value object. The duration only counts once the break
 * is closed; an open break means the visit is currently on break.
 */
export class VisitBreak extends ValueObject<VisitBreakProps> {
  private constructor(props: VisitBreakProps) {
    super(props);
  }

  /** Open a new break at the given moment. */
  public static open(startedAt: Date): VisitBreak {
    if (Number.isNaN(startedAt.getTime())) {
      throw new ValidationException('The break start time is not valid');
    }
    return new VisitBreak({ startedAt, endedAt: null });
  }

  /** Rehydrate a break from persistence (open or closed). */
  public static rehydrate(startedAt: Date, endedAt: Date | null): VisitBreak {
    if (endedAt !== null && endedAt.getTime() < startedAt.getTime()) {
      throw new ValidationException('A break cannot end before it started');
    }
    return new VisitBreak({ startedAt, endedAt });
  }

  /** Close an open break at the given moment, returning the closed break. */
  public close(endedAt: Date): VisitBreak {
    if (this.props.endedAt !== null) {
      throw new ValidationException('This break has already ended');
    }
    if (endedAt.getTime() < this.props.startedAt.getTime()) {
      throw new ValidationException('A break cannot end before it started');
    }
    return new VisitBreak({ startedAt: this.props.startedAt, endedAt });
  }

  public get startedAt(): Date {
    return this.props.startedAt;
  }

  public get endedAt(): Date | null {
    return this.props.endedAt;
  }

  public get isOpen(): boolean {
    return this.props.endedAt === null;
  }

  /** Whole seconds elapsed, once closed; zero while the break is still open. */
  public get durationSeconds(): number {
    if (this.props.endedAt === null) {
      return 0;
    }
    return Math.floor((this.props.endedAt.getTime() - this.props.startedAt.getTime()) / 1000);
  }
}
