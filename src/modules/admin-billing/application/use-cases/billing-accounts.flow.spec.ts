import { FamilyMemberStatus as PrismaFamilyStatus } from '@prisma/client';
import { FamilyDirectoryEntry } from '@modules/family-directory/domain/family-directory-entry.entity';
import { FamilyDirectoryEntryRepository } from '@modules/family-directory/domain/family-directory-entry.repository';
import { FamilyDirectorySubjectKind } from '@modules/family-directory/domain/family-directory-subject-kind.enum';
import { FamilyMemberStatus } from '@modules/family-directory/domain/family-member-status.enum';
import { Clock } from '@shared/application/ports/clock.port';
import { IdGenerator } from '@shared/application/ports/id-generator.port';
import { NotFoundDomainException, ValidationException } from '@shared/domain/domain-exception';
import {
  BillingAccountActivityView,
  BillingAccountDetailView,
  BillingAccountInvoiceRowView,
  BillingAccountPaymentRowView,
  BillingAccountRecipientView,
  BillingAccountRowView,
  BillingAccountsFilter,
  BillingAccountsReadModel,
  BillingAccountsView,
} from '../ports/billing-accounts-read.port';
import { CreateBillingAccountUseCase } from './create-billing-account.use-case';
import { GetBillingAccountActivityUseCase } from './get-billing-account-activity.use-case';
import { GetBillingAccountUseCase } from './get-billing-account.use-case';
import { ListBillingAccountInvoicesUseCase } from './list-billing-account-invoices.use-case';
import { ListBillingAccountPaymentsUseCase } from './list-billing-account-payments.use-case';
import { ListBillingAccountRecipientsUseCase } from './list-billing-account-recipients.use-case';
import { ListBillingAccountsUseCase } from './list-billing-accounts.use-case';

const NOW = new Date('2026-10-30T10:00:00.000Z');
const clock: Clock = { now: () => NOW };

function ids(): IdGenerator {
  let n = 0;
  return { generate: () => `id-${(n += 1)}` };
}

function row(overrides: Partial<BillingAccountRowView> = {}): BillingAccountRowView {
  return {
    id: 'a1',
    sequence: 42,
    accountName: 'Adeyemi Family Account',
    primaryContact: 'Funmilayo Adeyemi',
    phone: '+234 803 111 2222',
    branch: 'Lagos',
    recipientCount: 2,
    outstandingMinor: 45_000_000,
    currency: 'NGN',
    lastPaymentAt: new Date('2026-07-12T00:00:00.000Z'),
    status: PrismaFamilyStatus.ACTIVE,
    billingStatus: 'PENDING',
    ...overrides,
  };
}

describe('ListBillingAccountsUseCase', () => {
  it('maps rows to references, paginates and derives totalPages', async () => {
    let captured: BillingAccountsFilter | null = null;
    const view: BillingAccountsView = {
      rows: [row()],
      total: 156,
      counts: { all: 156, outstanding: 23, inactive: 12 },
      branches: ['Lagos', 'Abuja'],
    };
    const reads: BillingAccountsReadModel = {
      list: (filter) => {
        captured = filter;
        return Promise.resolve(view);
      },
      detail: () => Promise.resolve(null),
      careRecipients: () => Promise.resolve(null),
      invoices: () => Promise.resolve(null),
      payments: () => Promise.resolve(null),
      activity: () => Promise.resolve(null),
    };

    const result = await new ListBillingAccountsUseCase(reads, clock).execute({
      tab: 'ALL',
      search: null,
      branch: null,
      status: null,
      minBalanceMinor: null,
      maxBalanceMinor: null,
      page: 1,
      pageSize: null,
    });

    expect(captured).not.toBeNull();
    expect((captured as unknown as BillingAccountsFilter).pageSize).toBe(7);
    expect(result.total).toBe(156);
    expect(result.totalPages).toBe(23); // 156 over 7 rounds up to 23 pages
    expect(result.tabs).toEqual({ all: 156, outstanding: 23, inactive: 12 });
    expect(result.branches).toEqual(['Lagos', 'Abuja']);
    expect(result.accounts[0]).toMatchObject({
      reference: 'CP-42',
      accountName: 'Adeyemi Family Account',
      primaryContact: 'Funmilayo Adeyemi',
      lastPaymentAt: '2026-07-12T00:00:00.000Z',
    });
  });

  it('passes a null last payment through as null', async () => {
    const reads: BillingAccountsReadModel = {
      list: () =>
        Promise.resolve({
          rows: [row({ lastPaymentAt: null, outstandingMinor: 0, billingStatus: 'CURRENT' })],
          total: 1,
          counts: { all: 1, outstanding: 0, inactive: 0 },
          branches: [],
        }),
      detail: () => Promise.resolve(null),
      careRecipients: () => Promise.resolve(null),
      invoices: () => Promise.resolve(null),
      payments: () => Promise.resolve(null),
      activity: () => Promise.resolve(null),
    };
    const result = await new ListBillingAccountsUseCase(reads, clock).execute({
      tab: 'ALL',
      search: null,
      branch: null,
      status: null,
      minBalanceMinor: null,
      maxBalanceMinor: null,
      page: 1,
      pageSize: 7,
    });
    expect(result.accounts[0].lastPaymentAt).toBeNull();
  });
});

describe('GetBillingAccountUseCase', () => {
  function detailView(): BillingAccountDetailView {
    return {
      id: 'a1',
      sequence: 42,
      accountName: 'Adeyemi Family Account',
      primaryContact: 'Funmilayo Adeyemi',
      phone: '+234 803 111 2222',
      branch: 'Victoria Island',
      status: PrismaFamilyStatus.ACTIVE,
      createdAt: new Date('2025-01-12T00:00:00.000Z'),
      currency: 'NGN',
      paymentTermsDays: 30,
      preferredPaymentMethod: 'Bank Transfer',
      outstandingMinor: 45_000_000,
      totalBilledMinor: 420_000_000,
      totalPaidMinor: 375_000_000,
      lastPaymentAt: new Date('2026-07-12T14:32:00.000Z'),
      recentInvoices: [
        {
          sequence: 39,
          issuedAt: new Date('2026-07-10T09:00:00.000Z'),
          amountMinor: 45_000_000,
          dueDate: new Date('2026-07-30T00:00:00.000Z'),
          status: 'PENDING',
        },
      ],
      timeline: [
        {
          type: 'PAYMENT_RECORDED',
          at: new Date('2026-07-12T14:32:00.000Z'),
          amountMinor: 45_000_000,
          methodLabel: 'Bank Transfer',
          invoiceSequence: null,
          invoiceIssuedAt: null,
          recipientName: null,
          detail: null,
          actorName: null,
        },
        {
          type: 'INVOICE_ISSUED',
          at: new Date('2026-07-10T09:00:00.000Z'),
          amountMinor: null,
          methodLabel: null,
          invoiceSequence: 39,
          invoiceIssuedAt: new Date('2026-07-10T09:00:00.000Z'),
          recipientName: null,
          detail: null,
          actorName: null,
        },
      ],
    };
  }

  it('maps the account detail with references, invoice numbers and event titles', async () => {
    const reads: BillingAccountsReadModel = {
      list: () => Promise.reject(new Error('not used')),
      detail: () => Promise.resolve(detailView()),
      careRecipients: () => Promise.resolve(null),
      invoices: () => Promise.resolve(null),
      payments: () => Promise.resolve(null),
      activity: () => Promise.resolve(null),
    };
    const result = await new GetBillingAccountUseCase(reads).execute('a1');

    expect(result.summary.reference).toBe('CP-42');
    expect(result.summary.branch).toBe('Victoria Island');
    expect(result.summary.paymentTerms).toBe('Net 30');
    expect(result.summary.preferredMethod).toBe('Bank Transfer');
    expect(result.financial.totalBilledMinor).toBe(420_000_000);
    expect(result.recentInvoices[0]).toMatchObject({ number: 'INV-2026-039', status: 'PENDING' });
    expect(result.timeline[0]).toMatchObject({
      type: 'PAYMENT_RECORDED',
      title: 'Payment Recorded',
      methodLabel: 'Bank Transfer',
    });
    expect(result.timeline[1]).toMatchObject({
      title: 'Invoice Issued',
      invoiceNumber: 'INV-2026-039',
    });
  });

  it('throws when the account is missing', async () => {
    const reads: BillingAccountsReadModel = {
      list: () => Promise.reject(new Error('not used')),
      detail: () => Promise.resolve(null),
      careRecipients: () => Promise.resolve(null),
      invoices: () => Promise.resolve(null),
      payments: () => Promise.resolve(null),
      activity: () => Promise.resolve(null),
    };
    await expect(new GetBillingAccountUseCase(reads).execute('missing')).rejects.toBeInstanceOf(
      NotFoundDomainException,
    );
  });
});

describe('ListBillingAccountRecipientsUseCase', () => {
  function recipient(
    overrides: Partial<BillingAccountRecipientView> = {},
  ): BillingAccountRecipientView {
    return {
      id: 'r1',
      name: 'Funmilayo Adeyemi',
      photoKey: null,
      relationship: 'Self',
      servicePlan: 'Dementia Care',
      monthlyCostMinor: 85_000_000,
      currency: 'NGN',
      startDate: new Date('2025-03-15T00:00:00.000Z'),
      status: 'ACTIVE',
      ...overrides,
    };
  }

  it('maps recipients and totals, with the start date as an ISO string', async () => {
    const reads: BillingAccountsReadModel = {
      list: () => Promise.reject(new Error('not used')),
      detail: () => Promise.resolve(null),
      careRecipients: () =>
        Promise.resolve([
          recipient(),
          recipient({ id: 'r2', relationship: 'Father', servicePlan: null, startDate: null }),
        ]),
      invoices: () => Promise.resolve(null),
      payments: () => Promise.resolve(null),
      activity: () => Promise.resolve(null),
    };
    const result = await new ListBillingAccountRecipientsUseCase(reads).execute('a1');

    expect(result.total).toBe(2);
    expect(result.recipients[0]).toMatchObject({
      relationship: 'Self',
      servicePlan: 'Dementia Care',
      monthlyCostMinor: 85_000_000,
      startDate: '2025-03-15T00:00:00.000Z',
    });
    expect(result.recipients[1].servicePlan).toBeNull();
    expect(result.recipients[1].startDate).toBeNull();
  });

  it('throws when the account is missing', async () => {
    const reads: BillingAccountsReadModel = {
      list: () => Promise.reject(new Error('not used')),
      detail: () => Promise.resolve(null),
      careRecipients: () => Promise.resolve(null),
      invoices: () => Promise.resolve(null),
      payments: () => Promise.resolve(null),
      activity: () => Promise.resolve(null),
    };
    await expect(
      new ListBillingAccountRecipientsUseCase(reads).execute('missing'),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});

describe('ListBillingAccountInvoicesUseCase', () => {
  function invoice(
    overrides: Partial<BillingAccountInvoiceRowView> = {},
  ): BillingAccountInvoiceRowView {
    return {
      id: 'inv1',
      sequence: 42,
      issuedAt: new Date('2026-08-16T09:00:00.000Z'),
      periodStart: new Date('2026-08-01T00:00:00.000Z'),
      periodEnd: new Date('2026-08-15T00:00:00.000Z'),
      amountMinor: 25_000_000,
      dueDate: new Date('2026-08-15T00:00:00.000Z'),
      paidAmountMinor: 25_000_000,
      currency: 'NGN',
      status: 'PAID',
      ...overrides,
    };
  }

  it('maps invoices to numbers, ISO periods and the display status', async () => {
    const reads: BillingAccountsReadModel = {
      list: () => Promise.reject(new Error('not used')),
      detail: () => Promise.resolve(null),
      careRecipients: () => Promise.resolve(null),
      invoices: () =>
        Promise.resolve([
          invoice(),
          invoice({ id: 'inv2', sequence: 25, status: 'OVERDUE', paidAmountMinor: 0 }),
        ]),
      payments: () => Promise.resolve(null),
      activity: () => Promise.resolve(null),
    };
    const result = await new ListBillingAccountInvoicesUseCase(reads, clock).execute('a1');

    expect(result.total).toBe(2);
    expect(result.invoices[0]).toMatchObject({
      number: 'INV-2026-042',
      periodStart: '2026-08-01T00:00:00.000Z',
      periodEnd: '2026-08-15T00:00:00.000Z',
      amountMinor: 25_000_000,
      paidAmountMinor: 25_000_000,
      status: 'PAID',
    });
    expect(result.invoices[1]).toMatchObject({ status: 'OVERDUE', paidAmountMinor: 0 });
  });

  it('throws when the account is missing', async () => {
    const reads: BillingAccountsReadModel = {
      list: () => Promise.reject(new Error('not used')),
      detail: () => Promise.resolve(null),
      careRecipients: () => Promise.resolve(null),
      invoices: () => Promise.resolve(null),
      payments: () => Promise.resolve(null),
      activity: () => Promise.resolve(null),
    };
    await expect(
      new ListBillingAccountInvoicesUseCase(reads, clock).execute('missing'),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});

describe('ListBillingAccountPaymentsUseCase', () => {
  function payment(
    overrides: Partial<BillingAccountPaymentRowView> = {},
  ): BillingAccountPaymentRowView {
    return {
      id: 'p1',
      sequence: 84729103,
      invoiceSequence: 42,
      invoiceIssuedAt: new Date('2026-08-16T09:00:00.000Z'),
      amountMinor: 25_000_000,
      currency: 'NGN',
      methodLabel: 'Bank Transfer',
      receivedAt: new Date('2026-08-12T00:00:00.000Z'),
      ...overrides,
    };
  }

  it('maps payments to transaction and invoice numbers with a completed status', async () => {
    const reads: BillingAccountsReadModel = {
      list: () => Promise.reject(new Error('not used')),
      detail: () => Promise.resolve(null),
      careRecipients: () => Promise.resolve(null),
      invoices: () => Promise.resolve(null),
      payments: () =>
        Promise.resolve([
          payment(),
          payment({ id: 'p2', sequence: 7, invoiceSequence: null, invoiceIssuedAt: null }),
        ]),
      activity: () => Promise.resolve(null),
    };
    const result = await new ListBillingAccountPaymentsUseCase(reads).execute('a1');

    expect(result.total).toBe(2);
    expect(result.payments[0]).toMatchObject({
      reference: 'TXN-84729103',
      invoiceNumber: 'INV-2026-042',
      method: 'Bank Transfer',
      receivedAt: '2026-08-12T00:00:00.000Z',
      status: 'COMPLETED',
    });
    expect(result.payments[1]).toMatchObject({ reference: 'TXN-0007', invoiceNumber: null });
  });

  it('throws when the account is missing', async () => {
    const reads: BillingAccountsReadModel = {
      list: () => Promise.reject(new Error('not used')),
      detail: () => Promise.resolve(null),
      careRecipients: () => Promise.resolve(null),
      invoices: () => Promise.resolve(null),
      payments: () => Promise.resolve(null),
      activity: () => Promise.resolve(null),
    };
    await expect(
      new ListBillingAccountPaymentsUseCase(reads).execute('missing'),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});

describe('GetBillingAccountActivityUseCase', () => {
  function activityView(): BillingAccountActivityView {
    return {
      currency: 'NGN',
      events: [
        {
          type: 'PAYMENT_RECORDED',
          at: new Date('2026-07-14T16:45:00.000Z'),
          amountMinor: 60_000_000,
          methodLabel: 'Card (Mastercard)',
          invoiceSequence: 31,
          invoiceIssuedAt: new Date('2026-07-10T09:00:00.000Z'),
          periodStart: null,
          periodEnd: null,
          recipientName: null,
          detail: null,
          performedBy: null,
        },
        {
          type: 'INVOICE_ISSUED',
          at: new Date('2026-07-10T09:00:00.000Z'),
          amountMinor: 60_000_000,
          methodLabel: null,
          invoiceSequence: 31,
          invoiceIssuedAt: new Date('2026-07-10T09:00:00.000Z'),
          periodStart: new Date('2026-07-01T00:00:00.000Z'),
          periodEnd: new Date('2026-07-14T00:00:00.000Z'),
          recipientName: null,
          detail: null,
          performedBy: null,
        },
      ],
    };
  }

  it('maps activity events to titles, invoice numbers and ISO periods', async () => {
    const reads: BillingAccountsReadModel = {
      list: () => Promise.reject(new Error('not used')),
      detail: () => Promise.resolve(null),
      careRecipients: () => Promise.resolve(null),
      invoices: () => Promise.resolve(null),
      payments: () => Promise.resolve(null),
      activity: () => Promise.resolve(activityView()),
    };
    const result = await new GetBillingAccountActivityUseCase(reads).execute('a1');

    expect(result.currency).toBe('NGN');
    expect(result.total).toBe(2);
    expect(result.events[0]).toMatchObject({
      type: 'PAYMENT_RECORDED',
      title: 'Payment Recorded',
      invoiceNumber: 'INV-2026-031',
      methodLabel: 'Card (Mastercard)',
      performedBy: null,
    });
    expect(result.events[1]).toMatchObject({
      title: 'Invoice Issued',
      periodStart: '2026-07-01T00:00:00.000Z',
      periodEnd: '2026-07-14T00:00:00.000Z',
    });
  });

  it('throws when the account is missing', async () => {
    const reads: BillingAccountsReadModel = {
      list: () => Promise.reject(new Error('not used')),
      detail: () => Promise.resolve(null),
      careRecipients: () => Promise.resolve(null),
      invoices: () => Promise.resolve(null),
      payments: () => Promise.resolve(null),
      activity: () => Promise.resolve(null),
    };
    await expect(
      new GetBillingAccountActivityUseCase(reads).execute('missing'),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});

describe('CreateBillingAccountUseCase', () => {
  function repo(): FamilyDirectoryEntryRepository & { saved: FamilyDirectoryEntry[] } {
    const saved: FamilyDirectoryEntry[] = [];
    return {
      saved,
      save: (entry) => {
        saved.push(entry);
        return Promise.resolve();
      },
      saveMany: () => Promise.resolve(),
      findById: () => Promise.resolve(null),
      findByUserId: () => Promise.resolve(null),
      findByIds: () => Promise.resolve([]),
    };
  }

  it('opens an active captured account with its own name and branch', async () => {
    const r = repo();
    const result = await new CreateBillingAccountUseCase(r, ids(), clock).execute({
      accountName: 'Okafor Household',
      primaryContact: 'Chinedu Okafor',
      phone: '+234 805 333 4444',
      branch: 'Abuja',
    });

    expect(result.id).toBe('id-1');
    const entry = r.saved[0];
    expect(entry.accountName).toBe('Okafor Household');
    expect(entry.fullName).toBe('Chinedu Okafor');
    expect(entry.branch).toBe('Abuja');
    expect(entry.status).toBe(FamilyMemberStatus.Active);
    expect(entry.subjectKind).toBe(FamilyDirectorySubjectKind.Contact);
    expect(entry.userId).toBeNull();
  });

  it('rejects a blank account name', () => {
    expect(() =>
      FamilyDirectoryEntry.registerBillingAccount({
        id: 'x',
        accountName: '  ',
        primaryContact: 'Someone',
        now: NOW,
      }),
    ).toThrow(ValidationException);
  });
});
