import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import { NotFoundDomainException, ValidationException } from '@shared/domain/domain-exception';
import { Currency } from '@shared/domain/currency.enum';
import { AccountAdjustmentCategory } from '../../domain/account-adjustment-category.enum';
import { adjustmentReference } from '../../domain/account-adjustment-category.enum';
import { AccountAdjustment } from '../../domain/account-adjustment.entity';
import {
  ACCOUNT_ADJUSTMENT_REPOSITORY,
  AccountAdjustmentRepository,
} from '../../domain/account-adjustment.repository';
import { AccountAdjustmentCreatedResult } from '../dto/account-adjustments.result';

export interface CreateAccountAdjustmentCommand {
  category: AccountAdjustmentCategory;
  type: string;
  billingAccountId: string;
  /** The invoice a credit applies to (Apply Credit); null for an account level correction. */
  invoiceId: string | null;
  amountMinor: number;
  currency: Currency;
  reason: string;
  notes: string | null;
  createdById: string;
}

/** Raise a manual financial correction against a billing account (Create Adjustment). */
@Injectable()
export class CreateAccountAdjustmentUseCase {
  constructor(
    @Inject(ACCOUNT_ADJUSTMENT_REPOSITORY)
    private readonly adjustments: AccountAdjustmentRepository,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: CreateAccountAdjustmentCommand): Promise<AccountAdjustmentCreatedResult> {
    if (!(await this.adjustments.billingAccountExists(command.billingAccountId))) {
      throw new NotFoundDomainException('Billing account not found');
    }
    // A credit applied to an invoice must target an invoice on this account, in the same
    // currency, and cannot exceed what the invoice still owes (Apply Credit modal).
    if (command.invoiceId !== null) {
      const invoice = await this.adjustments.loadCreditableInvoice(
        command.billingAccountId,
        command.invoiceId,
      );
      if (invoice === null) {
        throw new NotFoundDomainException('Invoice not found on this billing account');
      }
      if (invoice.currency !== command.currency) {
        throw new ValidationException('The credit currency must match the invoice currency');
      }
      if (command.amountMinor > invoice.outstandingMinor) {
        throw new ValidationException('The credit cannot exceed the invoice outstanding balance');
      }
    }
    const adjustment = AccountAdjustment.create({
      id: this.ids.generate(),
      category: command.category,
      type: command.type,
      billingAccountId: command.billingAccountId,
      invoiceId: command.invoiceId,
      amountMinor: command.amountMinor,
      currency: command.currency,
      reason: command.reason,
      notes: command.notes,
      createdById: command.createdById,
      now: this.clock.now(),
    });
    const sequence = await this.adjustments.save(adjustment);
    return {
      id: adjustment.id,
      reference: adjustmentReference(adjustment.category, sequence, adjustment.createdAt),
      createdAt: adjustment.createdAt.toISOString(),
    };
  }
}
