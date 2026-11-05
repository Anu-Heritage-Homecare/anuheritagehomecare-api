import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { AccountAdjustmentStatus } from '../../domain/account-adjustment-status.enum';
import {
  ACCOUNT_ADJUSTMENT_REPOSITORY,
  AccountAdjustmentRepository,
} from '../../domain/account-adjustment.repository';

export interface ApproveAccountAdjustmentCommand {
  id: string;
  approvedById: string;
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
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: ApproveAccountAdjustmentCommand): Promise<ApproveAccountAdjustmentResult> {
    const adjustment = await this.adjustments.findById(command.id);
    if (adjustment === null) {
      throw new NotFoundDomainException('Adjustment not found');
    }
    adjustment.approve({ approvedById: command.approvedById, now: this.clock.now() });
    await this.adjustments.update(adjustment);
    return { id: adjustment.id, status: adjustment.status };
  }
}
