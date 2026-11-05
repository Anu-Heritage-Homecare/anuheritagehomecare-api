import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
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
  amountMinor: number;
  currency: Currency;
  reason: string;
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
    const adjustment = AccountAdjustment.create({
      id: this.ids.generate(),
      category: command.category,
      type: command.type,
      billingAccountId: command.billingAccountId,
      amountMinor: command.amountMinor,
      currency: command.currency,
      reason: command.reason,
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
