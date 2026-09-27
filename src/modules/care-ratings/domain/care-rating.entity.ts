import { AggregateRoot } from '@shared/domain/aggregate-root.base';
import { ValidationException } from '@shared/domain/domain-exception';
import { RatingReviewerType } from './rating-reviewer-type.enum';

const MIN_SCORE = 1;
const MAX_SCORE = 5;
const MAX_COMMENT_LENGTH = 1000;
const MAX_TRAITS = 10;
const MAX_TRAIT_LENGTH = 60;
const MAX_NAME_LENGTH = 200;
const MAX_RELATIONSHIP_LENGTH = 80;

interface CareRatingProps {
  careRecipientId: string | null;
  caregiverId: string | null;
  visitId: string | null;
  submittedByUserId: string | null;
  submittedByAdminId: string | null;
  reviewerType: RatingReviewerType;
  reviewerName: string | null;
  reviewerRelationship: string | null;
  score: number;
  comment: string | null;
  traits: string[];
  createdAt: Date;
}

/**
 * CareRating aggregate root: a satisfaction score (1 to 5) for the care a caregiver
 * delivered, with an optional comment and a set of praised traits. A FAMILY rating
 * is submitted by a family member (from the mobile app) for the care their loved one
 * received; a COORDINATOR rating is recorded by a care coordinator from the back
 * office. The reviewer's display name and relationship are snapshotted so a review
 * reads the same later even if the account changes. The dashboard reads the average
 * of these as Client Satisfaction, and the caregiver Performance tab reads them for
 * the client feedback, praised traits and recent reviews.
 */
export class CareRating extends AggregateRoot<string> {
  private props: CareRatingProps;

  private constructor(id: string, props: CareRatingProps) {
    super(id);
    this.props = props;
  }

  /** A family member's rating of the care a recipient received. */
  public static submit(params: {
    id: string;
    careRecipientId: string;
    caregiverId?: string | null;
    visitId?: string | null;
    submittedByUserId: string;
    reviewerName?: string | null;
    reviewerRelationship?: string | null;
    score: number;
    comment?: string | null;
    traits?: string[];
    now: Date;
  }): CareRating {
    return new CareRating(params.id, {
      careRecipientId: params.careRecipientId,
      caregiverId: params.caregiverId ?? null,
      visitId: params.visitId ?? null,
      submittedByUserId: params.submittedByUserId,
      submittedByAdminId: null,
      reviewerType: RatingReviewerType.Family,
      reviewerName: cleanText(params.reviewerName, MAX_NAME_LENGTH),
      reviewerRelationship: cleanText(params.reviewerRelationship, MAX_RELATIONSHIP_LENGTH),
      score: assertScore(params.score),
      comment: cleanText(params.comment, MAX_COMMENT_LENGTH),
      traits: cleanTraits(params.traits),
      createdAt: params.now,
    });
  }

  /** A care coordinator's review of a caregiver, recorded from the back office. */
  public static recordByCoordinator(params: {
    id: string;
    caregiverId: string;
    submittedByAdminId: string;
    reviewerName?: string | null;
    careRecipientId?: string | null;
    visitId?: string | null;
    score: number;
    comment?: string | null;
    traits?: string[];
    now: Date;
  }): CareRating {
    const caregiverId = params.caregiverId.trim();
    if (caregiverId.length === 0) {
      throw new ValidationException('A caregiver is required for a coordinator review');
    }
    return new CareRating(params.id, {
      careRecipientId: params.careRecipientId ?? null,
      caregiverId,
      visitId: params.visitId ?? null,
      submittedByUserId: null,
      submittedByAdminId: params.submittedByAdminId,
      reviewerType: RatingReviewerType.Coordinator,
      reviewerName: cleanText(params.reviewerName, MAX_NAME_LENGTH),
      reviewerRelationship: 'Coordinator',
      score: assertScore(params.score),
      comment: cleanText(params.comment, MAX_COMMENT_LENGTH),
      traits: cleanTraits(params.traits),
      createdAt: params.now,
    });
  }

  public static rehydrate(id: string, props: CareRatingProps): CareRating {
    return new CareRating(id, props);
  }

  public get careRecipientId(): string | null {
    return this.props.careRecipientId;
  }

  public get caregiverId(): string | null {
    return this.props.caregiverId;
  }

  public get visitId(): string | null {
    return this.props.visitId;
  }

  public get submittedByUserId(): string | null {
    return this.props.submittedByUserId;
  }

  public get submittedByAdminId(): string | null {
    return this.props.submittedByAdminId;
  }

  public get reviewerType(): RatingReviewerType {
    return this.props.reviewerType;
  }

  public get reviewerName(): string | null {
    return this.props.reviewerName;
  }

  public get reviewerRelationship(): string | null {
    return this.props.reviewerRelationship;
  }

  public get score(): number {
    return this.props.score;
  }

  public get comment(): string | null {
    return this.props.comment;
  }

  public get traits(): string[] {
    return [...this.props.traits];
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }
}

function assertScore(score: number): number {
  if (!Number.isInteger(score) || score < MIN_SCORE || score > MAX_SCORE) {
    throw new ValidationException(
      `Score must be a whole number between ${MIN_SCORE} and ${MAX_SCORE}`,
    );
  }
  return score;
}

function cleanText(value: string | null | undefined, max: number): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed.slice(0, max);
}

function cleanTraits(values: string[] | undefined): string[] {
  if (values === undefined) {
    return [];
  }
  const cleaned = values
    .map((value) => value.trim().slice(0, MAX_TRAIT_LENGTH))
    .filter((value) => value.length > 0);
  return [...new Set(cleaned)].slice(0, MAX_TRAITS);
}
