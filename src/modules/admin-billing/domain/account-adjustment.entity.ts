import { Currency } from '@shared/domain/currency.enum';
import { AggregateRoot } from '@shared/domain/aggregate-root.base';
import { ValidationException } from '@shared/domain/domain-exception';
import { AccountAdjustmentCategory } from './account-adjustment-category.enum';
import { AccountAdjustmentStatus } from './account-adjustment-status.enum';

interface AccountAdjustmentProps {
  category: AccountAdjustmentCategory;
  type: string;
  billingAccountId: string;
  invoiceId: string | null;
  amountMinor: number;
  currency: Currency;
  status: AccountAdjustmentStatus;
  reason: string;
  notes: string | null;
  approverNotes: string | null;
  createdById: string;
  createdAt: Date;
  approvedById: string | null;
  approvedAt: Date | null;
  rejectedById: string | null;
  rejectedAt: Date | null;
  reversedById: string | null;
  reversedAt: Date | null;
}

const MAX_TYPE = 80;
const MAX_REASON = 500;
const MAX_NOTES = 2000;

/**
 * A manual financial correction raised against a billing account. Created awaiting
 * approval; an admin approves it, which applies a credit, write off or adjustment
 * immediately (COMPLETED) but only starts a refund settling (PROCESSING), since a
 * refund moves real money and completes asynchronously. Amount is a positive integer
 * in the currency's minor units.
 */
export class AccountAdjustment extends AggregateRoot<string> {
  private props: AccountAdjustmentProps;

  private constructor(id: string, props: AccountAdjustmentProps) {
    super(id);
    this.props = props;
  }

  static create(params: {
    id: string;
    category: AccountAdjustmentCategory;
    type: string;
    billingAccountId: string;
    invoiceId?: string | null;
    amountMinor: number;
    currency: Currency;
    reason: string;
    notes?: string | null;
    createdById: string;
    now: Date;
  }): AccountAdjustment {
    const type = params.type.trim();
    if (type.length === 0) {
      throw new ValidationException('An adjustment type is required');
    }
    if (type.length > MAX_TYPE) {
      throw new ValidationException(`An adjustment type cannot exceed ${MAX_TYPE} characters`);
    }
    const reason = params.reason.trim();
    if (reason.length === 0) {
      throw new ValidationException('An adjustment reason is required');
    }
    if (reason.length > MAX_REASON) {
      throw new ValidationException(`An adjustment reason cannot exceed ${MAX_REASON} characters`);
    }
    const notes = params.notes?.trim() ?? '';
    if (notes.length > MAX_NOTES) {
      throw new ValidationException(`Adjustment notes cannot exceed ${MAX_NOTES} characters`);
    }
    if (!Number.isInteger(params.amountMinor) || params.amountMinor <= 0) {
      throw new ValidationException(
        'An adjustment amount must be a positive integer of minor units',
      );
    }
    return new AccountAdjustment(params.id, {
      category: params.category,
      type,
      billingAccountId: params.billingAccountId,
      invoiceId: params.invoiceId ?? null,
      amountMinor: params.amountMinor,
      currency: params.currency,
      status: AccountAdjustmentStatus.PendingApproval,
      reason,
      notes: notes.length === 0 ? null : notes,
      approverNotes: null,
      createdById: params.createdById,
      createdAt: params.now,
      approvedById: null,
      approvedAt: null,
      rejectedById: null,
      rejectedAt: null,
      reversedById: null,
      reversedAt: null,
    });
  }

  /** Rehydrate an entity from storage without re-running creation invariants. */
  static fromPersistence(id: string, props: AccountAdjustmentProps): AccountAdjustment {
    return new AccountAdjustment(id, props);
  }

  /**
   * Approve a correction awaiting approval. A refund starts settling (PROCESSING); any
   * other kind applies at once (COMPLETED). Approving anything else is rejected.
   */
  approve(params: { approvedById: string; approverNotes?: string | null; now: Date }): void {
    if (this.props.status !== AccountAdjustmentStatus.PendingApproval) {
      throw new ValidationException('Only an adjustment awaiting approval can be approved');
    }
    this.props.status =
      this.props.category === AccountAdjustmentCategory.Refund
        ? AccountAdjustmentStatus.Processing
        : AccountAdjustmentStatus.Completed;
    this.props.approvedById = params.approvedById;
    this.props.approvedAt = params.now;
    this.props.approverNotes = normaliseApproverNotes(params.approverNotes);
  }

  /**
   * Reject (decline) a correction awaiting approval (the Approve Adjustment modal). It is
   * never applied; only an adjustment awaiting approval can be rejected.
   */
  reject(params: { rejectedById: string; approverNotes?: string | null; now: Date }): void {
    if (this.props.status !== AccountAdjustmentStatus.PendingApproval) {
      throw new ValidationException('Only an adjustment awaiting approval can be rejected');
    }
    this.props.status = AccountAdjustmentStatus.Rejected;
    this.props.rejectedById = params.rejectedById;
    this.props.rejectedAt = params.now;
    this.props.approverNotes = normaliseApproverNotes(params.approverNotes);
  }

  /** Reverse (void) a correction. Only an already reversed one cannot be reversed again. */
  reverse(params: { reversedById: string; now: Date }): void {
    if (this.props.status === AccountAdjustmentStatus.Reversed) {
      throw new ValidationException('This adjustment is already reversed');
    }
    this.props.status = AccountAdjustmentStatus.Reversed;
    this.props.reversedById = params.reversedById;
    this.props.reversedAt = params.now;
  }

  get category(): AccountAdjustmentCategory {
    return this.props.category;
  }

  get type(): string {
    return this.props.type;
  }

  get billingAccountId(): string {
    return this.props.billingAccountId;
  }

  get invoiceId(): string | null {
    return this.props.invoiceId;
  }

  get notes(): string | null {
    return this.props.notes;
  }

  get approverNotes(): string | null {
    return this.props.approverNotes;
  }

  get amountMinor(): number {
    return this.props.amountMinor;
  }

  get currency(): Currency {
    return this.props.currency;
  }

  get status(): AccountAdjustmentStatus {
    return this.props.status;
  }

  get reason(): string {
    return this.props.reason;
  }

  get createdById(): string {
    return this.props.createdById;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get approvedById(): string | null {
    return this.props.approvedById;
  }

  get approvedAt(): Date | null {
    return this.props.approvedAt;
  }

  get rejectedById(): string | null {
    return this.props.rejectedById;
  }

  get rejectedAt(): Date | null {
    return this.props.rejectedAt;
  }

  get reversedById(): string | null {
    return this.props.reversedById;
  }

  get reversedAt(): Date | null {
    return this.props.reversedAt;
  }
}

/** Trim approver notes to null when blank, capped to the stored length. */
function normaliseApproverNotes(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  if (trimmed.length === 0) {
    return null;
  }
  if (trimmed.length > MAX_NOTES) {
    throw new ValidationException(`Approver notes cannot exceed ${MAX_NOTES} characters`);
  }
  return trimmed;
}
