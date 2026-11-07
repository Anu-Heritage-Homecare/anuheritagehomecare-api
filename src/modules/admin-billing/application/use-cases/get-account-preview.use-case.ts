import { Injectable } from '@nestjs/common';
import { AccountPreviewResult } from '../dto/account-preview.result';
import { GetBillingAccountUseCase } from './get-billing-account.use-case';
import { ListBillingAccountRecipientsUseCase } from './list-billing-account-recipients.use-case';

/**
 * The Account Preview drawer: a light summary composed from the account detail and its
 * linked recipients. Read only; reuses the Overview and Care Recipients reads.
 */
@Injectable()
export class GetAccountPreviewUseCase {
  constructor(
    private readonly account: GetBillingAccountUseCase,
    private readonly recipients: ListBillingAccountRecipientsUseCase,
  ) {}

  async execute(id: string): Promise<AccountPreviewResult> {
    const [account, recipients] = await Promise.all([
      this.account.execute(id),
      this.recipients.execute(id),
    ]);

    return {
      id: account.id,
      accountName: account.accountName,
      reference: account.summary.reference,
      status: account.status,
      primaryContact: {
        name: account.primaryContact,
        email: account.email,
        phone: account.phone,
      },
      financial: {
        currency: account.financial.currency,
        outstandingMinor: account.financial.outstandingMinor,
        totalBilledMinor: account.financial.totalBilledMinor,
        lastPaymentAt: account.financial.lastPaymentAt,
      },
      linkedRecipients: recipients.recipients.map((recipient) => ({
        name: recipient.name,
        relationship: recipient.relationship,
      })),
      recentInvoices: account.recentInvoices.map((invoice) => ({
        number: invoice.number,
        amountMinor: invoice.amountMinor,
        dueDate: invoice.dueDate,
        status: invoice.status,
      })),
    };
  }
}
