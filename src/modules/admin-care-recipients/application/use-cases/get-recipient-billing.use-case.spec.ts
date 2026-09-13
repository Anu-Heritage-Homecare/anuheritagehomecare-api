import { CareRecipient } from '@modules/care-recipients/domain/care-recipient.entity';
import { CareRecipientRepository } from '@modules/care-recipients/domain/care-recipient.repository';
import { User } from '@modules/identity/domain/user.entity';
import { UserRepository } from '@modules/identity/domain/user.repository';
import { BillingProfile } from '@modules/recipient-billing/domain/billing-profile.entity';
import { BillingProfileRepository } from '@modules/recipient-billing/domain/billing-profile.repository';
import { InvoiceStatus } from '@modules/recipient-billing/domain/invoice-status.enum';
import { Currency } from '@shared/domain/currency.enum';
import { Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import {
  BillingSummaryView,
  InvoicePageView,
  InvoiceRowView,
  PaymentRowView,
  RecipientBillingReadModel,
  ServiceBreakdownRowView,
} from '../ports/recipient-billing-read.port';
import { GetRecipientBillingUseCase } from './get-recipient-billing.use-case';

const NOW = new Date('2026-07-24T00:00:00.000Z');
const clock: Clock = { now: () => NOW };
const R = 'r1';

function recipients(exists: boolean): CareRecipientRepository {
  return {
    save: () => Promise.resolve(),
    findById: (id) =>
      Promise.resolve(
        exists && id === R ? ({ id, ownerId: 'owner1' } as unknown as CareRecipient) : null,
      ),
    findByIds: () => Promise.resolve([]),
    listByOwner: () => Promise.resolve([]),
  };
}

const owner = {
  name: { fullName: 'David Johnson' },
  email: { value: 'david.johnson@email.com' },
  phone: { value: '+15551234567' },
  relationshipToRecipient: 'Son',
  address: { country: 'NG' },
} as unknown as User;

function users(withOwner: boolean): UserRepository {
  return {
    save: () => Promise.resolve(),
    findById: () => Promise.resolve(withOwner ? owner : null),
    findByIds: () => Promise.resolve([]),
    findByEmail: () => Promise.resolve(null),
    existsByEmail: () => Promise.resolve(false),
    existsByPhone: () => Promise.resolve(false),
    countByType: () => Promise.resolve(0),
  };
}

function profiles(profile: BillingProfile | null): BillingProfileRepository {
  return {
    findByRecipient: () => Promise.resolve(profile),
    save: () => Promise.resolve(),
  };
}

function invoiceRow(overrides: Partial<InvoiceRowView>): InvoiceRowView {
  return {
    id: 'inv1',
    sequence: 89,
    issuedAt: new Date('2026-07-20T00:00:00.000Z'),
    periodStart: new Date('2026-07-01T00:00:00.000Z'),
    periodEnd: new Date('2026-07-15T00:00:00.000Z'),
    servicesLabel: 'Morning + Afternoon Care (15 visits)',
    currency: Currency.NigerianNaira,
    amountMinor: 450_000,
    insuranceCoveredMinor: 360_000,
    status: InvoiceStatus.Paid,
    dueDate: null,
    ...overrides,
  };
}

const summaryView: BillingSummaryView = {
  currency: Currency.NigerianNaira,
  billedThisMonthMinor: 845_000,
  billedLastMonthMinor: 803_000,
  outstandingMinor: 120_000,
  earliestDueDate: new Date('2026-11-01T00:00:00.000Z'),
  lastPaymentMinor: 420_000,
  lastPaymentAt: new Date('2026-07-15T00:00:00.000Z'),
  overdueCount: 0,
};

class FakeReadModel implements RecipientBillingReadModel {
  constructor(
    private readonly page: InvoicePageView,
    private readonly summaryView: BillingSummaryView,
    private readonly breakdown: ServiceBreakdownRowView[],
    private readonly payments: PaymentRowView[],
  ) {}
  listInvoices(): Promise<InvoicePageView> {
    return Promise.resolve(this.page);
  }
  summary(): Promise<BillingSummaryView> {
    return Promise.resolve(this.summaryView);
  }
  serviceBreakdown(): Promise<ServiceBreakdownRowView[]> {
    return Promise.resolve(this.breakdown);
  }
  paymentHistory(): Promise<PaymentRowView[]> {
    return Promise.resolve(this.payments);
  }
}

describe('GetRecipientBillingUseCase', () => {
  it('rejects an unknown recipient', async () => {
    const useCase = new GetRecipientBillingUseCase(
      recipients(false),
      new FakeReadModel({ rows: [], total: 0 }, summaryView, [], []),
      profiles(null),
      users(true),
      clock,
    );
    await expect(useCase.execute('nope', 1)).rejects.toBeInstanceOf(NotFoundDomainException);
  });

  it('builds the summary cards with the billed trend and payment status', async () => {
    const useCase = new GetRecipientBillingUseCase(
      recipients(true),
      new FakeReadModel({ rows: [], total: 0 }, summaryView, [], []),
      profiles(null),
      users(true),
      clock,
    );
    const result = await useCase.execute(R, 1);
    expect(result.summary.totalBilledThisMonth).toEqual({ amountMinor: 845_000, currency: 'NGN' });
    expect(result.summary.billedTrendPercent).toBe(5.2);
    expect(result.summary.outstanding?.amountMinor).toBe(120_000);
    expect(result.summary.lastPayment?.amountMinor).toBe(420_000);
    expect(result.summary.paymentStatus).toBe('GOOD');
  });

  it('formats the invoice number, patient due and derives overdue', async () => {
    const overdue = invoiceRow({
      id: 'od',
      sequence: 90,
      status: InvoiceStatus.Pending,
      dueDate: new Date('2026-07-01T00:00:00.000Z'),
    });
    const paid = invoiceRow({ id: 'pd' });
    const useCase = new GetRecipientBillingUseCase(
      recipients(true),
      new FakeReadModel({ rows: [overdue, paid], total: 2 }, summaryView, [], []),
      profiles(null),
      users(true),
      clock,
    );
    const result = await useCase.execute(R, 1);
    const byId = new Map(result.invoices.items.map((i) => [i.id, i]));
    expect(byId.get('pd')?.number).toBe('INV-2026-089');
    expect(byId.get('pd')?.patientDue.amountMinor).toBe(90_000);
    expect(byId.get('pd')?.displayStatus).toBe('PAID');
    // Pending and past its due date -> overdue.
    expect(byId.get('od')?.displayStatus).toBe('OVERDUE');
  });

  it('falls back to the owner for the billing contact when no profile exists', async () => {
    const useCase = new GetRecipientBillingUseCase(
      recipients(true),
      new FakeReadModel({ rows: [], total: 0 }, summaryView, [], []),
      profiles(null),
      users(true),
      clock,
    );
    const result = await useCase.execute(R, 1);
    expect(result.profile.contact.name).toBe('David Johnson');
    expect(result.profile.contact.relationship).toBe('Son');
    expect(result.profile.contact.email).toBe('david.johnson@email.com');
    expect(result.profile.insurance.provider).toBeNull();
  });

  it('uses the office set billing profile when present', async () => {
    const profile = BillingProfile.create({
      id: 'bp1',
      careRecipientId: R,
      billingContactName: 'Jane Guarantor',
      paymentMethodBrand: 'VISA',
      paymentMethodLast4: '4521',
      autoPayEnabled: true,
      primaryInsuranceProvider: 'MedCare Plus',
      primaryInsurancePolicyNumber: 'MC-789456',
      primaryInsuranceCoveragePercent: 80,
      coPayPerVisitMinor: 5000,
      coPayCurrency: Currency.NigerianNaira,
      now: NOW,
    });
    const useCase = new GetRecipientBillingUseCase(
      recipients(true),
      new FakeReadModel({ rows: [], total: 0 }, summaryView, [], []),
      profiles(profile),
      users(true),
      clock,
    );
    const result = await useCase.execute(R, 1);
    expect(result.profile.contact.name).toBe('Jane Guarantor');
    expect(result.profile.paymentMethod.last4).toBe('4521');
    expect(result.profile.paymentMethod.autoPayEnabled).toBe(true);
    expect(result.profile.insurance.coveragePercent).toBe(80);
    expect(result.profile.insurance.coPayPerVisit).toEqual({ amountMinor: 5000, currency: 'NGN' });
  });

  it('computes service breakdown percentages of the year to date total', async () => {
    const useCase = new GetRecipientBillingUseCase(
      recipients(true),
      new FakeReadModel(
        { rows: [], total: 0 },
        summaryView,
        [
          { serviceName: 'Morning Care', amountMinor: 320_000 },
          { serviceName: 'Afternoon Care', amountMinor: 280_000 },
        ],
        [],
      ),
      profiles(null),
      users(true),
      clock,
    );
    const result = await useCase.execute(R, 1);
    expect(result.serviceBreakdown.total?.amountMinor).toBe(600_000);
    const morning = result.serviceBreakdown.items.find((i) => i.serviceName === 'Morning Care');
    expect(morning?.percent).toBe(53.3);
  });
});
