import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { AccountAdjustmentCategory } from '../../domain/account-adjustment-category.enum';
import { AccountAdjustmentStatus } from '../../domain/account-adjustment-status.enum';
import {
  ACCOUNT_ADJUSTMENT_REPOSITORY,
  AccountAdjustmentRepository,
} from '../../domain/account-adjustment.repository';
import { INVOICE_CREDIT_WRITER, InvoiceCreditWriter } from '../../domain/invoice-credit-writer';

export interface ApproveAccountAdjustmentCommand {
  id: string;
  approvedById: string;
  approverNotes: string | null;
}

export interface ApproveAccountAdjustmentResult {
  id: string;
  status: AccountAdjustmentStatus;
}

/** Approve a correction awaiting approval (the Approve action). */
@Injectable()
export class ApproveAccountAdjustmentUseCase {
  constructor(
    @Inject(ACCOUNT_ADJUSTMENT_REPOSITORY)
    private readonly adjustments: AccountAdjustmentRepository,
    @Inject(INVOICE_CREDIT_WRITER)
    private readonly credits: InvoiceCreditWriter,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: ApproveAccountAdjustmentCommand): Promise<ApproveAccountAdjustmentResult> {
    const adjustment = await this.adjustments.findById(command.id);
    if (adjustment === null) {
      throw new NotFoundDomainException('Adjustment not found');
    }
    const now = this.clock.now();
    adjustment.approve({
      approvedById: command.approvedById,
      approverNotes: command.approverNotes,
      now,
    });
    await this.adjustments.update(adjustment);
    // An approved credit applied to an invoice settles part of that invoice now.
    if (
      adjustment.category === AccountAdjustmentCategory.Credit &&
      adjustment.invoiceId !== null &&
      adjustment.status === AccountAdjustmentStatus.Completed
    ) {
      await this.credits.applyCredit({
        adjustmentId: adjustment.id,
        invoiceId: adjustment.invoiceId,
        amountMinor: adjustment.amountMinor,
        currency: adjustment.currency,
        now,
      });
    }
    return { id: adjustment.id, status: adjustment.status };
  }
}
