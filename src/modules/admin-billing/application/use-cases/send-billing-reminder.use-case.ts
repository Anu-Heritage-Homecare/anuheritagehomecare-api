import { Inject, Injectable } from '@nestjs/common';
import {
  BILLING_ACCOUNT_EVENT_RECORDER,
  BillingAccountEventRecorder,
} from '@shared/application/ports/billing-account-event-recorder.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import {
  BILLING_ACCOUNTS_READ_MODEL,
  BillingAccountsReadModel,
} from '../ports/billing-accounts-read.port';

export interface SendBillingReminderCommand {
  accountId: string;
  adminId: string;
}

/**
 * Record that the office sent a payment reminder to a billing account. The reminder
 * appears on the account Activity Timeline and the Billing dashboard activity feed.
 *
 * shortcut: records the reminder only; it does not yet dispatch the email or SMS.
 * Wire the EMAIL_SENDER / an SMS port here when the notice is to actually be sent.
 */
@Injectable()
export class SendBillingReminderUseCase {
  constructor(
    @Inject(BILLING_ACCOUNTS_READ_MODEL) private readonly reads: BillingAccountsReadModel,
    @Inject(BILLING_ACCOUNT_EVENT_RECORDER) private readonly events: BillingAccountEventRecorder,
  ) {}

  async execute(command: SendBillingReminderCommand): Promise<void> {
    const account = await this.reads.detail(command.accountId);
    if (account === null) {
      throw new NotFoundDomainException('Billing account not found');
    }

    await this.events.record({
      familyDirectoryEntryId: command.accountId,
      kind: 'REMINDER_SENT',
      detail: 'Outstanding balance notice sent',
      actorAdminId: command.adminId,
    });
  }
}
