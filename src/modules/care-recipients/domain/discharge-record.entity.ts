import { AggregateRoot } from '@shared/domain/aggregate-root.base';
import { ValidationException } from '@shared/domain/domain-exception';
import { DischargeAcknowledgement } from './discharge-acknowledgement.enum';
import { DischargeAction } from './discharge-action.enum';
import { DischargeReason } from './discharge-reason.enum';
import { DischargeRecordStatus } from './discharge-record-status.enum';

interface DischargeRecordProps {
  careRecipientId: string;
  action: DischargeAction;
  reason: DischargeReason | null;
  effectiveDate: Date | null;
  clinicalSummary: string | null;
  acknowledgements: DischargeAcknowledgement[];
  status: DischargeRecordStatus;
  processedByAdminId: string | null;
  processedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const MAX_SUMMARY_LENGTH = 4000;

export interface DischargeRecordFields {
  action: DischargeAction;
  reason?: DischargeReason | null;
  effectiveDate?: Date | null;
  clinicalSummary?: string | null;
  acknowledgements?: DischargeAcknowledgement[] | null;
}

/**
 * The formal archive/discharge record for a care recipient: the administrative
 * action (a reversible hold or a full discharge), its reason, effective date,
 * clinical summary and the compliance acknowledgements. Saved as a DRAFT and revised,
 * then PROCESSED once executed. One per recipient. Processing a discharge requires all
 * compliance acknowledgements; the clinical summary is sensitive and kept out of logs.
 */
export class DischargeRecord extends AggregateRoot<string> {
  private readonly props: DischargeRecordProps;

  private constructor(id: string, props: DischargeRecordProps) {
    super(id);
    this.props = props;
  }

  public static draft(params: {
    id: string;
    careRecipientId: string;
    fields: DischargeRecordFields;
    now: Date;
  }): DischargeRecord {
    return new DischargeRecord(params.id, {
      careRecipientId: params.careRecipientId,
      action: params.fields.action,
      reason: params.fields.reason ?? null,
      effectiveDate: params.fields.effectiveDate ?? null,
      clinicalSummary: DischargeRecord.cleanSummary(params.fields.clinicalSummary),
      acknowledgements: DischargeRecord.cleanAcknowledgements(params.fields.acknowledgements),
      status: DischargeRecordStatus.Draft,
      processedByAdminId: null,
      processedAt: null,
      createdAt: params.now,
      updatedAt: params.now,
    });
  }

  public static rehydrate(id: string, props: DischargeRecordProps): DischargeRecord {
    return new DischargeRecord(id, {
      ...props,
      acknowledgements: [...props.acknowledgements],
    });
  }

  /** Replace the editable fields. Only a draft may be revised. */
  public revise(fields: DischargeRecordFields, now: Date): void {
    this.ensureDraft();
    this.props.action = fields.action;
    this.props.reason = fields.reason ?? null;
    this.props.effectiveDate = fields.effectiveDate ?? null;
    this.props.clinicalSummary = DischargeRecord.cleanSummary(fields.clinicalSummary);
    this.props.acknowledgements = DischargeRecord.cleanAcknowledgements(fields.acknowledgements);
    this.props.updatedAt = now;
  }

  /**
   * Formally process the record. Requires a reason and an effective date; a full
   * discharge additionally requires a clinical summary and every compliance
   * acknowledgement. Immutable once processed.
   */
  public process(processedByAdminId: string, now: Date): void {
    this.ensureDraft();
    if (this.props.reason === null) {
      throw new ValidationException('A discharge reason is required');
    }
    if (this.props.effectiveDate === null) {
      throw new ValidationException('An effective date is required');
    }
    if (this.props.action === DischargeAction.Discharge) {
      if (this.props.clinicalSummary === null) {
        throw new ValidationException('A discharge clinical summary is required');
      }
      const missing = ALL_ACK_COUNT - this.props.acknowledgements.length;
      if (missing > 0) {
        throw new ValidationException('All compliance acknowledgements are required to discharge');
      }
    }
    this.props.status = DischargeRecordStatus.Processed;
    this.props.processedByAdminId = processedByAdminId;
    this.props.processedAt = now;
    this.props.updatedAt = now;
  }

  private ensureDraft(): void {
    if (this.props.status !== DischargeRecordStatus.Draft) {
      throw new ValidationException('This discharge has already been processed');
    }
  }

  private static cleanSummary(raw: string | null | undefined): string | null {
    if (raw === null || raw === undefined) {
      return null;
    }
    const value = raw.trim();
    if (value.length === 0) {
      return null;
    }
    if (value.length > MAX_SUMMARY_LENGTH) {
      throw new ValidationException('The clinical summary exceeds the maximum length');
    }
    return value;
  }

  private static cleanAcknowledgements(
    raw: DischargeAcknowledgement[] | null | undefined,
  ): DischargeAcknowledgement[] {
    if (raw === null || raw === undefined) {
      return [];
    }
    return [...new Set(raw)];
  }

  public get careRecipientId(): string {
    return this.props.careRecipientId;
  }

  public get action(): DischargeAction {
    return this.props.action;
  }

  public get reason(): DischargeReason | null {
    return this.props.reason;
  }

  public get effectiveDate(): Date | null {
    return this.props.effectiveDate;
  }

  public get clinicalSummary(): string | null {
    return this.props.clinicalSummary;
  }

  public get acknowledgements(): DischargeAcknowledgement[] {
    return [...this.props.acknowledgements];
  }

  public get status(): DischargeRecordStatus {
    return this.props.status;
  }

  public get processedByAdminId(): string | null {
    return this.props.processedByAdminId;
  }

  public get processedAt(): Date | null {
    return this.props.processedAt;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }

  public get updatedAt(): Date {
    return this.props.updatedAt;
  }
}

const ALL_ACK_COUNT = Object.keys(DischargeAcknowledgement).length;
