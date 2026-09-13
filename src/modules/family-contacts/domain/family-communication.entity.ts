import { Entity } from '@shared/domain/entity.base';
import { ValidationException } from '@shared/domain/domain-exception';
import { FamilyCommunicationType } from './family-communication-type.enum';

interface FamilyCommunicationProps {
  careRecipientId: string;
  familyContactId: string;
  type: FamilyCommunicationType;
  subject: string;
  /** The staff member who handled the interaction (free text). */
  staffMemberName: string;
  occurredAt: Date;
  createdAt: Date;
}

const MAX_SUBJECT_LENGTH = 300;
const MAX_NAME_LENGTH = 120;

/**
 * One logged interaction with a family contact (an app message, phone call, in person
 * visit, email or video call). Append only; feeds the Recent Communication Log and the
 * last contact shown on each contact card.
 */
export class FamilyCommunication extends Entity<string> {
  private readonly props: FamilyCommunicationProps;

  private constructor(id: string, props: FamilyCommunicationProps) {
    super(id);
    this.props = props;
  }

  public static record(params: {
    id: string;
    careRecipientId: string;
    familyContactId: string;
    type: FamilyCommunicationType;
    subject: string;
    staffMemberName: string;
    occurredAt: Date;
    now: Date;
  }): FamilyCommunication {
    const subject = params.subject.trim();
    if (subject.length === 0) {
      throw new ValidationException('A communication must have a subject');
    }
    if (subject.length > MAX_SUBJECT_LENGTH) {
      throw new ValidationException('A communication subject exceeds the maximum length');
    }
    const staffMemberName = params.staffMemberName.trim();
    if (staffMemberName.length === 0) {
      throw new ValidationException('A communication must record the staff member');
    }
    if (staffMemberName.length > MAX_NAME_LENGTH) {
      throw new ValidationException('A communication staff member name exceeds the maximum length');
    }
    if (Number.isNaN(params.occurredAt.getTime())) {
      throw new ValidationException('The communication date is not valid');
    }
    return new FamilyCommunication(params.id, {
      careRecipientId: params.careRecipientId,
      familyContactId: params.familyContactId,
      type: params.type,
      subject,
      staffMemberName,
      occurredAt: params.occurredAt,
      createdAt: params.now,
    });
  }

  public static rehydrate(id: string, props: FamilyCommunicationProps): FamilyCommunication {
    return new FamilyCommunication(id, props);
  }

  public get careRecipientId(): string {
    return this.props.careRecipientId;
  }

  public get familyContactId(): string {
    return this.props.familyContactId;
  }

  public get type(): FamilyCommunicationType {
    return this.props.type;
  }

  public get subject(): string {
    return this.props.subject;
  }

  public get staffMemberName(): string {
    return this.props.staffMemberName;
  }

  public get occurredAt(): Date {
    return this.props.occurredAt;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }
}
