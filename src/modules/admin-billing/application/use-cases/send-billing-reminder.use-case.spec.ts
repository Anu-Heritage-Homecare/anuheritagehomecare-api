import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { RecordBillingAccountEvent } from '@shared/application/ports/billing-account-event-recorder.port';
import {
  BillingAccountDetailView,
  BillingAccountsReadModel,
} from '../ports/billing-accounts-read.port';
import { SendBillingReminderUseCase } from './send-billing-reminder.use-case';

function reads(detail: BillingAccountDetailView | null): BillingAccountsReadModel {
  return {
    list: () => Promise.reject(new Error('not used')),
    detail: () => Promise.resolve(detail),
    careRecipients: () => Promise.resolve(null),
    invoices: () => Promise.resolve(null),
    payments: () => Promise.resolve(null),
    activity: () => Promise.resolve(null),
  };
}

describe('SendBillingReminderUseCase', () => {
  it('records a reminder attributed to the admin', async () => {
    const recorded: RecordBillingAccountEvent[] = [];
    const recorder = {
      record: (e: RecordBillingAccountEvent) => {
        recorded.push(e);
        return Promise.resolve();
      },
    };
    const view = { id: 'acc-1' } as BillingAccountDetailView;

    await new SendBillingReminderUseCase(reads(view), recorder).execute({
      accountId: 'acc-1',
      adminId: 'admin-7',
    });

    expect(recorded).toHaveLength(1);
    expect(recorded[0]).toMatchObject({
      familyDirectoryEntryId: 'acc-1',
      kind: 'REMINDER_SENT',
      actorAdminId: 'admin-7',
    });
  });

  it('throws when the account is missing', async () => {
    const recorder = { record: () => Promise.resolve() };
    await expect(
      new SendBillingReminderUseCase(reads(null), recorder).execute({
        accountId: 'missing',
        adminId: 'admin-7',
      }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});
