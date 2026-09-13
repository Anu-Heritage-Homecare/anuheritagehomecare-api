import { Entity } from '@shared/domain/entity.base';
import { ValidationException } from '@shared/domain/domain-exception';

interface MedicationAuditProps {
  careRecipientId: string;
  title: string;
  detail: string;
  /** The admin who recorded the change, for attribution. Null for system entries. */
  authorAdminId: string | null;
  createdAt: Date;
}

const MAX_TITLE_LENGTH = 200;
const MAX_DETAIL_LENGTH = 1000;

/**
 * One append only entry in a recipient's prescription history and audit trail (for
 * example "Donepezil increased 5mg to 10mg"), attributed to the admin who recorded
 * it. Immutable once written. This is sensitive clinical data and must never be
 * logged.
 */
export class MedicationAudit extends Entity<string> {
  private readonly props: MedicationAuditProps;

  private constructor(id: string, props: MedicationAuditProps) {
    super(id);
    this.props = props;
  }

  public static record(params: {
    id: string;
    careRecipientId: string;
    title: string;
    detail: string;
    authorAdminId?: string | null;
    now: Date;
  }): MedicationAudit {
    const title = params.title.trim();
    if (title.length === 0) {
      throw new ValidationException('An audit entry must have a title');
    }
    if (title.length > MAX_TITLE_LENGTH) {
      throw new ValidationException('An audit entry title exceeds the maximum length');
    }
    const detail = params.detail.trim();
    if (detail.length > MAX_DETAIL_LENGTH) {
      throw new ValidationException('An audit entry detail exceeds the maximum length');
    }
    return new MedicationAudit(params.id, {
      careRecipientId: params.careRecipientId,
      title,
      detail,
      authorAdminId: params.authorAdminId ?? null,
      createdAt: params.now,
    });
  }

  public static rehydrate(id: string, props: MedicationAuditProps): MedicationAudit {
    return new MedicationAudit(id, props);
  }

  public get careRecipientId(): string {
    return this.props.careRecipientId;
  }

  public get title(): string {
    return this.props.title;
  }

  public get detail(): string {
    return this.props.detail;
  }

  public get authorAdminId(): string | null {
    return this.props.authorAdminId;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }
}
