import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { AccountAdjustmentStatus } from '../../domain/account-adjustment-status.enum';
import {
  ACCOUNT_ADJUSTMENT_REPOSITORY,
  AccountAdjustmentRepository,
} from '../../domain/account-adjustment.repository';

export interface RejectAccountAdjustmentCommand {
  id: string;
  rejectedById: string;
  approverNotes: string | null;
}

export interface RejectAccountAdjustmentResult {
  id: string;
  status: AccountAdjustmentStatus;
}

/** Reject (decline) a correction awaiting approval (the Approve Adjustment modal). */
@Injectable()
export class RejectAccountAdjustmentUseCase {
  constructor(
    @Inject(ACCOUNT_ADJUSTMENT_REPOSITORY)
    private readonly adjustments: AccountAdjustmentRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: RejectAccountAdjustmentCommand): Promise<RejectAccountAdjustmentResult> {
    const adjustment = await this.adjustments.findById(command.id);
    if (adjustment === null) {
      throw new NotFoundDomainException('Adjustment not found');
    }
    adjustment.reject({
      rejectedById: command.rejectedById,
      approverNotes: command.approverNotes,
      now: this.clock.now(),
    });
    await this.adjustments.update(adjustment);
    return { id: adjustment.id, status: adjustment.status };
  }
}
