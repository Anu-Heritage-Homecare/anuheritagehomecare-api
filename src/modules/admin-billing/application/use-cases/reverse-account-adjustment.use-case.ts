import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { AccountAdjustmentStatus } from '../../domain/account-adjustment-status.enum';
import {
  ACCOUNT_ADJUSTMENT_REPOSITORY,
  AccountAdjustmentRepository,
} from '../../domain/account-adjustment.repository';

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
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: ReverseAccountAdjustmentCommand): Promise<ReverseAccountAdjustmentResult> {
    const adjustment = await this.adjustments.findById(command.id);
    if (adjustment === null) {
      throw new NotFoundDomainException('Adjustment not found');
    }
    adjustment.reverse({ reversedById: command.reversedById, now: this.clock.now() });
    await this.adjustments.update(adjustment);
    return { id: adjustment.id, status: adjustment.status };
  }
}
