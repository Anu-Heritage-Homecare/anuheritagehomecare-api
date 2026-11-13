import { Clock } from '@shared/application/ports/clock.port';
import { IdGenerator } from '@shared/application/ports/id-generator.port';
import { Currency } from '@shared/domain/currency.enum';
import { NotFoundDomainException, ValidationException } from '@shared/domain/domain-exception';
import { AccountAdjustmentCategory } from '../../domain/account-adjustment-category.enum';
import { AccountAdjustmentStatus } from '../../domain/account-adjustment-status.enum';
import { AccountAdjustment } from '../../domain/account-adjustment.entity';
import {
  AccountAdjustmentRepository,
  CreditableInvoice,
} from '../../domain/account-adjustment.repository';
import { ApplyCreditCommand, InvoiceCreditWriter } from '../../domain/invoice-credit-writer';
import {
  AccountAdjustmentRowView,
  AccountAdjustmentsFilter,
  AccountAdjustmentsReadModel,
  AccountAdjustmentsView,
} from '../ports/account-adjustments-read.port';
import { ApproveAccountAdjustmentUseCase } from './approve-account-adjustment.use-case';
import { CreateAccountAdjustmentUseCase } from './create-account-adjustment.use-case';
import { ListAccountAdjustmentsUseCase } from './list-account-adjustments.use-case';
import { RejectAccountAdjustmentUseCase } from './reject-account-adjustment.use-case';
import { ReverseAccountAdjustmentUseCase } from './reverse-account-adjustment.use-case';

const NOW = new Date('2026-08-12T10:00:00.000Z');
const clock: Clock = { now: () => NOW };
const ids: IdGenerator = { generate: () => 'adj-1' };

function newAdjustment(category: AccountAdjustmentCategory): AccountAdjustment {
  return AccountAdjustment.create({
    id: 'a1',
    category,
    type: 'Billing Refund',
    billingAccountId: 'acc1',
    amountMinor: 32_000_000,
    currency: Currency.NigerianNaira,
    reason: 'Billed twice',
    createdById: 'admin1',
    now: NOW,
  });
}

describe('AccountAdjustment entity', () => {
  it('trims text, starts awaiting approval and keeps the amount', () => {
    const adj = AccountAdjustment.create({
      id: 'a1',
      category: AccountAdjustmentCategory.Credit,
      type: '  Account Credit  ',
      billingAccountId: 'acc1',
      amountMinor: 15_000_000,
      currency: Currency.NigerianNaira,
      reason: '  Goodwill credit  ',
      createdById: 'admin1',
      now: NOW,
    });
    expect(adj.type).toBe('Account Credit');
    expect(adj.reason).toBe('Goodwill credit');
    expect(adj.status).toBe(AccountAdjustmentStatus.PendingApproval);
    expect(adj.approvedAt).toBeNull();
    expect(adj.approvedById).toBeNull();
  });

  it('rejects a non positive or fractional amount', () => {
    const base = {
      id: 'a1',
      category: AccountAdjustmentCategory.Refund,
      type: 'Overpayment',
      billingAccountId: 'acc1',
      currency: Currency.NigerianNaira,
      reason: 'x',
      createdById: 'admin1',
      now: NOW,
    };
    expect(() => AccountAdjustment.create({ ...base, amountMinor: 0 })).toThrow(
      ValidationException,
    );
    expect(() => AccountAdjustment.create({ ...base, amountMinor: -5 })).toThrow(
      ValidationException,
    );
    expect(() => AccountAdjustment.create({ ...base, amountMinor: 1.5 })).toThrow(
      ValidationException,
    );
  });

  it('rejects a blank type or reason', () => {
    const base = {
      id: 'a1',
      category: AccountAdjustmentCategory.Credit,
      billingAccountId: 'acc1',
      amountMinor: 100,
      currency: Currency.NigerianNaira,
      createdById: 'admin1',
      now: NOW,
    };
    expect(() => AccountAdjustment.create({ ...base, type: '  ', reason: 'ok' })).toThrow(
      ValidationException,
    );
    expect(() => AccountAdjustment.create({ ...base, type: 'ok', reason: '  ' })).toThrow(
      ValidationException,
    );
  });

  it('approving a refund starts it processing, a credit completes at once', () => {
    const refund = newAdjustment(AccountAdjustmentCategory.Refund);
    refund.approve({ approvedById: 'admin2', now: NOW });
    expect(refund.status).toBe(AccountAdjustmentStatus.Processing);
    expect(refund.approvedById).toBe('admin2');
    expect(refund.approvedAt).toBe(NOW);

    const credit = newAdjustment(AccountAdjustmentCategory.Credit);
    credit.approve({ approvedById: 'admin2', now: NOW });
    expect(credit.status).toBe(AccountAdjustmentStatus.Completed);
  });

  it('rejects approving something that is not awaiting approval', () => {
    const refund = newAdjustment(AccountAdjustmentCategory.Refund);
    refund.approve({ approvedById: 'admin2', now: NOW });
    expect(() => refund.approve({ approvedById: 'admin2', now: NOW })).toThrow(ValidationException);
  });

  it('reverses a correction and refuses to reverse it twice', () => {
    const adj = newAdjustment(AccountAdjustmentCategory.Adjustment);
    adj.approve({ approvedById: 'admin2', now: NOW });
    adj.reverse({ reversedById: 'admin3', now: NOW });
    expect(adj.status).toBe(AccountAdjustmentStatus.Reversed);
    expect(adj.reversedById).toBe('admin3');
    expect(() => adj.reverse({ reversedById: 'admin3', now: NOW })).toThrow(ValidationException);
  });
});

function repo(
  options: {
    exists?: boolean;
    stored?: AccountAdjustment | null;
    creditable?: CreditableInvoice | null;
  } = {},
): AccountAdjustmentRepository & { saved: AccountAdjustment[]; updated: AccountAdjustment[] } {
  const saved: AccountAdjustment[] = [];
  const updated: AccountAdjustment[] = [];
  return {
    saved,
    updated,
    save: (adjustment) => {
      saved.push(adjustment);
      return Promise.resolve(7);
    },
    update: (adjustment) => {
      updated.push(adjustment);
      return Promise.resolve();
    },
    findById: () => Promise.resolve(options.stored ?? null),
    billingAccountExists: () => Promise.resolve(options.exists ?? true),
    loadCreditableInvoice: () => Promise.resolve(options.creditable ?? null),
  };
}

function creditWriter(): InvoiceCreditWriter & {
  applied: ApplyCreditCommand[];
  removed: string[];
} {
  const applied: ApplyCreditCommand[] = [];
  const removed: string[] = [];
  return {
    applied,
    removed,
    applyCredit: (command) => {
      applied.push(command);
      return Promise.resolve();
    },
    removeCredit: (adjustmentId) => {
      removed.push(adjustmentId);
      return Promise.resolve();
    },
  };
}

describe('CreateAccountAdjustmentUseCase', () => {
  it('creates an adjustment and returns the category reference for the assigned sequence', async () => {
    const r = repo({ exists: true });
    const result = await new CreateAccountAdjustmentUseCase(r, ids, clock).execute({
      category: AccountAdjustmentCategory.Credit,
      type: 'Account Credit',
      billingAccountId: 'acc1',
      invoiceId: null,
      amountMinor: 15_000_000,
      currency: Currency.NigerianNaira,
      reason: 'Goodwill credit',
      notes: null,
      createdById: 'admin1',
    });

    expect(result.id).toBe('adj-1');
    expect(result.reference).toBe('CRD-2026-007');
    expect(result.createdAt).toBe(NOW.toISOString());
    expect(r.saved[0].createdById).toBe('admin1');
  });

  it('applies a credit to an invoice on this account within its outstanding balance', async () => {
    const r = repo({
      exists: true,
      creditable: {
        careRecipientId: 'rec1',
        currency: Currency.NigerianNaira,
        outstandingMinor: 45_000_000,
      },
    });
    const result = await new CreateAccountAdjustmentUseCase(r, ids, clock).execute({
      category: AccountAdjustmentCategory.Credit,
      type: 'Account Credit',
      billingAccountId: 'acc1',
      invoiceId: 'inv1',
      amountMinor: 15_000_000,
      currency: Currency.NigerianNaira,
      reason: 'Service Resolution / Goodwill',
      notes: 'Agreed with family',
      createdById: 'admin1',
    });
    expect(result.id).toBe('adj-1');
    expect(r.saved[0].invoiceId).toBe('inv1');
    expect(r.saved[0].notes).toBe('Agreed with family');
  });

  it('rejects a credit whose invoice is not on the billing account', async () => {
    const r = repo({ exists: true, creditable: null });
    await expect(
      new CreateAccountAdjustmentUseCase(r, ids, clock).execute({
        category: AccountAdjustmentCategory.Credit,
        type: 'Account Credit',
        billingAccountId: 'acc1',
        invoiceId: 'inv-elsewhere',
        amountMinor: 15_000_000,
        currency: Currency.NigerianNaira,
        reason: 'Goodwill',
        notes: null,
        createdById: 'admin1',
      }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
    expect(r.saved).toHaveLength(0);
  });

  it('rejects a credit that exceeds the invoice outstanding balance', async () => {
    const r = repo({
      exists: true,
      creditable: {
        careRecipientId: 'rec1',
        currency: Currency.NigerianNaira,
        outstandingMinor: 10_000_000,
      },
    });
    await expect(
      new CreateAccountAdjustmentUseCase(r, ids, clock).execute({
        category: AccountAdjustmentCategory.Credit,
        type: 'Account Credit',
        billingAccountId: 'acc1',
        invoiceId: 'inv1',
        amountMinor: 15_000_000,
        currency: Currency.NigerianNaira,
        reason: 'Goodwill',
        notes: null,
        createdById: 'admin1',
      }),
    ).rejects.toBeInstanceOf(ValidationException);
    expect(r.saved).toHaveLength(0);
  });

  it('throws when the billing account is missing, without saving', async () => {
    const r = repo({ exists: false });
    await expect(
      new CreateAccountAdjustmentUseCase(r, ids, clock).execute({
        category: AccountAdjustmentCategory.Refund,
        type: 'Overpayment',
        billingAccountId: 'missing',
        invoiceId: null,
        amountMinor: 100,
        currency: Currency.NigerianNaira,
        reason: 'x',
        notes: null,
        createdById: 'admin1',
      }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
    expect(r.saved).toHaveLength(0);
  });
});

function creditForInvoice(): AccountAdjustment {
  return AccountAdjustment.create({
    id: 'a1',
    category: AccountAdjustmentCategory.Credit,
    type: 'Account Credit',
    billingAccountId: 'acc1',
    invoiceId: 'inv1',
    amountMinor: 15_000_000,
    currency: Currency.NigerianNaira,
    reason: 'Goodwill',
    notes: null,
    createdById: 'admin1',
    now: NOW,
  });
}

describe('ApproveAccountAdjustmentUseCase', () => {
  it('approves a stored adjustment and persists the new status', async () => {
    const r = repo({ stored: newAdjustment(AccountAdjustmentCategory.Refund) });
    const credits = creditWriter();
    const result = await new ApproveAccountAdjustmentUseCase(r, credits, clock).execute({
      id: 'a1',
      approvedById: 'admin2',
      approverNotes: 'Verified against the roster',
    });
    expect(result.status).toBe(AccountAdjustmentStatus.Processing);
    expect(r.updated[0].approvedById).toBe('admin2');
    expect(r.updated[0].approverNotes).toBe('Verified against the roster');
    expect(credits.applied).toHaveLength(0);
  });

  it('applies the credit to its invoice when a credit is approved', async () => {
    const r = repo({ stored: creditForInvoice() });
    const credits = creditWriter();
    const result = await new ApproveAccountAdjustmentUseCase(r, credits, clock).execute({
      id: 'a1',
      approvedById: 'admin2',
      approverNotes: null,
    });
    expect(result.status).toBe(AccountAdjustmentStatus.Completed);
    expect(credits.applied).toEqual([
      {
        adjustmentId: 'a1',
        invoiceId: 'inv1',
        amountMinor: 15_000_000,
        currency: Currency.NigerianNaira,
        now: NOW,
      },
    ]);
  });

  it('throws when the adjustment does not exist', async () => {
    const r = repo({ stored: null });
    await expect(
      new ApproveAccountAdjustmentUseCase(r, creditWriter(), clock).execute({
        id: 'missing',
        approvedById: 'a2',
        approverNotes: null,
      }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
    expect(r.updated).toHaveLength(0);
  });
});

describe('RejectAccountAdjustmentUseCase', () => {
  it('rejects a pending adjustment and records the approver notes', async () => {
    const r = repo({ stored: newAdjustment(AccountAdjustmentCategory.Credit) });
    const result = await new RejectAccountAdjustmentUseCase(r, clock).execute({
      id: 'a1',
      rejectedById: 'admin9',
      approverNotes: 'Rate was actually correct',
    });
    expect(result.status).toBe(AccountAdjustmentStatus.Rejected);
    expect(r.updated[0].rejectedById).toBe('admin9');
    expect(r.updated[0].approverNotes).toBe('Rate was actually correct');
  });

  it('refuses to reject an adjustment that is not awaiting approval', async () => {
    const approved = newAdjustment(AccountAdjustmentCategory.Credit);
    approved.approve({ approvedById: 'admin2', now: NOW });
    const r = repo({ stored: approved });
    await expect(
      new RejectAccountAdjustmentUseCase(r, clock).execute({
        id: 'a1',
        rejectedById: 'admin9',
        approverNotes: null,
      }),
    ).rejects.toBeInstanceOf(ValidationException);
  });

  it('throws when the adjustment does not exist', async () => {
    const r = repo({ stored: null });
    await expect(
      new RejectAccountAdjustmentUseCase(r, clock).execute({
        id: 'missing',
        rejectedById: 'admin9',
        approverNotes: null,
      }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
    expect(r.updated).toHaveLength(0);
  });
});

describe('ReverseAccountAdjustmentUseCase', () => {
  it('reverses a stored adjustment and persists the reverser', async () => {
    const r = repo({ stored: newAdjustment(AccountAdjustmentCategory.Adjustment) });
    const credits = creditWriter();
    const result = await new ReverseAccountAdjustmentUseCase(r, credits, clock).execute({
      id: 'a1',
      reversedById: 'admin3',
    });
    expect(result.status).toBe(AccountAdjustmentStatus.Reversed);
    expect(r.updated[0].reversedById).toBe('admin3');
    expect(credits.removed).toHaveLength(0);
  });

  it('removes the invoice settlement when an applied credit is reversed', async () => {
    const applied = creditForInvoice();
    applied.approve({ approvedById: 'admin2', now: NOW });
    const r = repo({ stored: applied });
    const credits = creditWriter();
    await new ReverseAccountAdjustmentUseCase(r, credits, clock).execute({
      id: 'a1',
      reversedById: 'admin3',
    });
    expect(credits.removed).toEqual(['a1']);
  });

  it('throws when the adjustment does not exist', async () => {
    const r = repo({ stored: null });
    await expect(
      new ReverseAccountAdjustmentUseCase(r, creditWriter(), clock).execute({
        id: 'missing',
        reversedById: 'a3',
      }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
    expect(r.updated).toHaveLength(0);
  });
});

describe('ListAccountAdjustmentsUseCase', () => {
  function row(overrides: Partial<AccountAdjustmentRowView> = {}): AccountAdjustmentRowView {
    return {
      id: 'a1',
      sequence: 1,
      category: AccountAdjustmentCategory.Refund,
      type: 'Billing Refund',
      billingAccountId: 'acc1',
      billingAccountName: 'Yusuf Ibrahim Care Fund',
      amountMinor: 32_000_000,
      currency: 'NGN',
      reason: 'Billed twice',
      status: AccountAdjustmentStatus.Completed,
      createdAt: new Date('2026-08-15T00:00:00.000Z'),
      ...overrides,
    };
  }

  it('maps rows to references, defaults to five per page and returns tab counts', async () => {
    let captured: AccountAdjustmentsFilter | null = null;
    const view: AccountAdjustmentsView = {
      rows: [row()],
      total: 17,
      counts: { credits: 34, refunds: 18, writeOffs: 7, adjustments: 22 },
      types: ['Billing Refund', 'Overcharge Refund'],
    };
    const reads: AccountAdjustmentsReadModel = {
      list: (filter) => {
        captured = filter;
        return Promise.resolve(view);
      },
    };

    const result = await new ListAccountAdjustmentsUseCase(reads).execute({
      category: AccountAdjustmentCategory.Refund,
      status: null,
      type: null,
      search: null,
      minAmountMinor: null,
      maxAmountMinor: null,
      page: 1,
      pageSize: null,
    });

    expect(captured).not.toBeNull();
    expect((captured as unknown as AccountAdjustmentsFilter).pageSize).toBe(5);
    expect(result.total).toBe(17);
    expect(result.totalPages).toBe(4); // 17 over 5 rounds up to 4
    expect(result.tabs.refunds).toBe(18);
    expect(result.types).toEqual(['Billing Refund', 'Overcharge Refund']);
    expect(result.adjustments[0]).toMatchObject({
      reference: 'REF-2026-001',
      type: 'Billing Refund',
      billingAccountName: 'Yusuf Ibrahim Care Fund',
      reason: 'Billed twice',
      status: AccountAdjustmentStatus.Completed,
    });
  });

  it('builds the write-off reference with the WRF prefix', async () => {
    const reads: AccountAdjustmentsReadModel = {
      list: () =>
        Promise.resolve({
          rows: [
            row({
              category: AccountAdjustmentCategory.WriteOff,
              type: 'Bad Debt Write-off',
              sequence: 1,
            }),
          ],
          total: 1,
          counts: { credits: 0, refunds: 0, writeOffs: 1, adjustments: 0 },
          types: ['Bad Debt Write-off'],
        }),
    };
    const result = await new ListAccountAdjustmentsUseCase(reads).execute({
      category: AccountAdjustmentCategory.WriteOff,
      status: null,
      type: null,
      search: null,
      minAmountMinor: null,
      maxAmountMinor: null,
      page: 1,
      pageSize: null,
    });
    expect(result.adjustments[0].reference).toBe('WRF-2026-001');
  });
});
