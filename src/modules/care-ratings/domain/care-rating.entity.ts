import { AggregateRoot } from '@shared/domain/aggregate-root.base';
import { ValidationException } from '@shared/domain/domain-exception';

const MIN_SCORE = 1;
const MAX_SCORE = 5;
const MAX_COMMENT_LENGTH = 1000;

interface CareRatingProps {
  careRecipientId: string;
  visitId: string | null;
  submittedByUserId: string;
  score: number;
  comment: string | null;
  createdAt: Date;
}

/**
 * CareRating aggregate root: a family member's satisfaction score (1 to 5) for the
 * care a recipient received, optionally tied to a specific visit. The dashboard
 * reads the average of these as the Client Satisfaction figure. The capture
 * surface (the family rating screen) is built with its own screen; this models the
 * data and its invariants.
 */
export class CareRating extends AggregateRoot<string> {
  private props: CareRatingProps;

  private constructor(id: string, props: CareRatingProps) {
    super(id);
    this.props = props;
  }

  public static submit(params: {
    id: string;
    careRecipientId: string;
    visitId?: string | null;
    submittedByUserId: string;
    score: number;
    comment?: string | null;
    now: Date;
  }): CareRating {
    if (!Number.isInteger(params.score) || params.score < MIN_SCORE || params.score > MAX_SCORE) {
      throw new ValidationException(
        `Score must be a whole number between ${MIN_SCORE} and ${MAX_SCORE}`,
      );
    }
    const comment =
      params.comment === null || params.comment === undefined || params.comment.trim().length === 0
        ? null
        : params.comment.trim().slice(0, MAX_COMMENT_LENGTH);

    return new CareRating(params.id, {
      careRecipientId: params.careRecipientId,
      visitId: params.visitId ?? null,
      submittedByUserId: params.submittedByUserId,
      score: params.score,
      comment,
      createdAt: params.now,
    });
  }

  public static rehydrate(id: string, props: CareRatingProps): CareRating {
    return new CareRating(id, props);
  }

  public get careRecipientId(): string {
    return this.props.careRecipientId;
  }

  public get visitId(): string | null {
    return this.props.visitId;
  }

  public get submittedByUserId(): string {
    return this.props.submittedByUserId;
  }

  public get score(): number {
    return this.props.score;
  }

  public get comment(): string | null {
    return this.props.comment;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }
}
