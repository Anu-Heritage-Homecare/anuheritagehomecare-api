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

export interface ReverseAccountAdjustmentCommand {
  id: string;
  reversedById: string;
}

export interface ReverseAccountAdjustmentResult {
  id: string;
  status: AccountAdjustmentStatus;
}

/** Reverse (void) a correction (the Reverse action). */
@Injectable()
export class ReverseAccountAdjustmentUseCase {
  constructor(
    @Inject(ACCOUNT_ADJUSTMENT_REPOSITORY)
    private readonly adjustments: AccountAdjustmentRepository,
    @Inject(INVOICE_CREDIT_WRITER)
    private readonly credits: InvoiceCreditWriter,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: ReverseAccountAdjustmentCommand): Promise<ReverseAccountAdjustmentResult> {
    const adjustment = await this.adjustments.findById(command.id);
    if (adjustment === null) {
      throw new NotFoundDomainException('Adjustment not found');
    }
    // A credit that was already applied to an invoice (COMPLETED) must have its invoice
    // settlement removed when reversed, restoring the invoice outstanding balance.
    const wasApplied =
      adjustment.category === AccountAdjustmentCategory.Credit &&
      adjustment.invoiceId !== null &&
      adjustment.status === AccountAdjustmentStatus.Completed;
    adjustment.reverse({ reversedById: command.reversedById, now: this.clock.now() });
    await this.adjustments.update(adjustment);
    if (wasApplied) {
      await this.credits.removeCredit(adjustment.id);
    }
    return { id: adjustment.id, status: adjustment.status };
  }
}
