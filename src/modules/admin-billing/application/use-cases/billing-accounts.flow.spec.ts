import { FamilyMemberStatus as PrismaFamilyStatus } from '@prisma/client';
import { FamilyDirectoryEntry } from '@modules/family-directory/domain/family-directory-entry.entity';
import { FamilyDirectoryEntryRepository } from '@modules/family-directory/domain/family-directory-entry.repository';
import { FamilyDirectorySubjectKind } from '@modules/family-directory/domain/family-directory-subject-kind.enum';
import { FamilyMemberStatus } from '@modules/family-directory/domain/family-member-status.enum';
import { Clock } from '@shared/application/ports/clock.port';
import { IdGenerator } from '@shared/application/ports/id-generator.port';
import { ValidationException } from '@shared/domain/domain-exception';
import {
  BillingAccountRowView,
  BillingAccountsFilter,
  BillingAccountsReadModel,
  BillingAccountsView,
} from '../ports/billing-accounts-read.port';
import { CreateBillingAccountUseCase } from './create-billing-account.use-case';
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
      reference: 'ACC-42',
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
