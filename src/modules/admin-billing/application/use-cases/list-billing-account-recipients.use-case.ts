import { Inject, Injectable } from '@nestjs/common';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { BillingAccountRecipientsResult } from '../dto/billing-account-recipients.result';
import {
  BILLING_ACCOUNTS_READ_MODEL,
  BillingAccountsReadModel,
} from '../ports/billing-accounts-read.port';

/** The Care Recipients tab: the recipients billed under one account. Read only. */
@Injectable()
export class ListBillingAccountRecipientsUseCase {
  constructor(
    @Inject(BILLING_ACCOUNTS_READ_MODEL) private readonly reads: BillingAccountsReadModel,
  ) {}

  async execute(id: string): Promise<BillingAccountRecipientsResult> {
    const recipients = await this.reads.careRecipients(id);
    if (recipients === null) {
      throw new NotFoundDomainException('Billing account not found');
    }
    return {
      recipients: recipients.map((recipient) => ({
        id: recipient.id,
        name: recipient.name,
        photoKey: recipient.photoKey,
        relationship: recipient.relationship,
        servicePlan: recipient.servicePlan,
        monthlyCostMinor: recipient.monthlyCostMinor,
        currency: recipient.currency,
        startDate: recipient.startDate === null ? null : recipient.startDate.toISOString(),
        status: recipient.status,
      })),
      total: recipients.length,
    };
  }
}
