import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { BillingAccountDetailResult } from '../dto/billing-account-detail.result';
import { BillingAccountRecipientsResult } from '../dto/billing-account-recipients.result';
import { GetAccountPreviewUseCase } from './get-account-preview.use-case';
import { GetBillingAccountUseCase } from './get-billing-account.use-case';
import { ListBillingAccountRecipientsUseCase } from './list-billing-account-recipients.use-case';

function accountResult(): BillingAccountDetailResult {
  return {
    id: 'a1',
    accountName: 'Adeyemi Family Account',
    primaryContact: 'Babatunde Adeyemi',
    email: 'babatunde@adeyemifamily.com',
    phone: '+234 803 123 4567',
    status: 'ACTIVE',
    summary: {
      reference: 'ACC-2026-0812',
      createdDate: '2026-01-02T00:00:00.000Z',
      branch: 'Lagos',
      paymentTerms: 'Net 30',
      preferredMethod: 'Bank Transfer',
    },
    financial: {
      currency: 'NGN',
      outstandingMinor: 45_000_000,
      totalBilledMinor: 420_000_000,
      totalPaidMinor: 375_000_000,
      lastPaymentAt: '2026-07-12T00:00:00.000Z',
    },
    recentInvoices: [
      {
        number: 'INV-2026-451',
        amountMinor: 45_000_000,
        dueDate: '2026-08-15',
        status: 'AWAITING_PAYMENT',
      },
    ],
    timeline: [],
  };
}

function recipientsResult(): BillingAccountRecipientsResult {
  return {
    recipients: [
      {
        id: 'r1',
        name: 'Adebola Adeyemi',
        photoKey: null,
        relationship: 'Grandmother',
        servicePlan: null,
        monthlyCostMinor: null,
        currency: null,
        startDate: null,
        status: 'ACTIVE',
      },
    ],
    total: 1,
  };
}

/** Wrap a precomputed result in a use case stub matching the method signature. */
function previewFrom(
  account: BillingAccountDetailResult | null,
  recipients: BillingAccountRecipientsResult,
): GetAccountPreviewUseCase {
  const accountUseCase = {
    execute: () =>
      account === null
        ? Promise.reject(new NotFoundDomainException('Billing account not found'))
        : Promise.resolve(account),
  } as unknown as GetBillingAccountUseCase;
  const recipientsUseCase = {
    execute: () => Promise.resolve(recipients),
  } as unknown as ListBillingAccountRecipientsUseCase;
  return new GetAccountPreviewUseCase(accountUseCase, recipientsUseCase);
}

describe('GetAccountPreviewUseCase', () => {
  it('composes the contact, financials, linked recipients and recent invoices', async () => {
    const result = await previewFrom(accountResult(), recipientsResult()).execute('a1');

    expect(result.reference).toBe('ACC-2026-0812');
    expect(result.primaryContact).toEqual({
      name: 'Babatunde Adeyemi',
      email: 'babatunde@adeyemifamily.com',
      phone: '+234 803 123 4567',
    });
    expect(result.financial.outstandingMinor).toBe(45_000_000);
    expect(result.financial.totalBilledMinor).toBe(420_000_000);
    expect(result.linkedRecipients).toEqual([
      { name: 'Adebola Adeyemi', relationship: 'Grandmother' },
    ]);
    expect(result.recentInvoices[0]).toEqual({
      number: 'INV-2026-451',
      amountMinor: 45_000_000,
      dueDate: '2026-08-15',
      status: 'AWAITING_PAYMENT',
    });
  });

  it('propagates not found when the account is unknown', async () => {
    await expect(previewFrom(null, recipientsResult()).execute('missing')).rejects.toBeInstanceOf(
      NotFoundDomainException,
    );
  });
});
