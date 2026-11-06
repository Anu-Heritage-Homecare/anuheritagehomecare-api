import { Clock } from '@shared/application/ports/clock.port';
import { Currency } from '@shared/domain/currency.enum';
import { NotFoundDomainException, ValidationException } from '@shared/domain/domain-exception';
import { BillingSettings } from '../../domain/billing-settings.entity';
import { BillingPaymentMethodSetting } from '../../domain/billing-payment-method.entity';
import { BillingSettingsRepository } from '../../domain/billing-settings.repository';
import { InvoiceWriteRepository, NewInvoice } from '../../domain/invoice-write.repository';
import {
  BillableServiceView,
  BillableServicesCatalogReadModel,
} from '../ports/billable-services-read.port';
import { CreateInvoiceCommand, CreateInvoiceUseCase } from './create-invoice.use-case';

const NOW = new Date('2026-07-31T10:00:00.000Z');
const clock: Clock = { now: () => NOW };

class FakeWriteRepo implements InvoiceWriteRepository {
  created: NewInvoice | null = null;
  constructor(private readonly exists: boolean) {}
  recipientExists(): Promise<boolean> {
    return Promise.resolve(this.exists);
  }
  create(invoice: NewInvoice): Promise<{ id: string; sequence: number }> {
    this.created = invoice;
    return Promise.resolve({ id: 'inv1', sequence: 451 });
  }
}

function catalog(services: BillableServiceView[]): BillableServicesCatalogReadModel {
  return { list: () => Promise.resolve(services) };
}

function settingsRepo(settings: BillingSettings | null): BillingSettingsRepository {
  return {
    load: () => Promise.resolve(settings),
    save: () => Promise.resolve(),
    loadPaymentMethods: () => Promise.resolve([]),
    loadPaymentMethod: () => Promise.resolve(null),
    savePaymentMethod: (_method: BillingPaymentMethodSetting) => Promise.resolve(),
  };
}

const CATALOG: BillableServiceView[] = [
  {
    id: 's1',
    code: 'SPECIALIST_NURSING',
    name: 'Specialist Nursing Support',
    description: 'Physiotherapy and post stroke rehab',
    category: 'Nursing',
    unit: 'HOURLY',
    rateMinor: 1_500_000,
  },
];

function command(over: Partial<CreateInvoiceCommand> = {}): CreateInvoiceCommand {
  return {
    careRecipientId: 'r1',
    periodStart: new Date('2026-07-01T00:00:00.000Z'),
    periodEnd: new Date('2026-07-31T00:00:00.000Z'),
    paymentTermsDays: null,
    insuranceCoveredMinor: 0,
    currency: Currency.NigerianNaira,
    lines: [
      {
        serviceId: 's1',
        quantity: 60,
        serviceDateStart: '2026-07-01',
        serviceDateEnd: '2026-07-31',
        caregiverId: '7a3d1e2c-0000-4000-8000-000000000001',
      },
    ],
    discounts: [{ label: 'Loyalty Discount', kind: 'PERCENT', value: 5 }],
    adjustments: [],
    ...over,
  };
}

describe('CreateInvoiceUseCase', () => {
  function build(repo: FakeWriteRepo): CreateInvoiceUseCase {
    return new CreateInvoiceUseCase(repo, catalog(CATALOG), settingsRepo(null), clock);
  }

  it('snapshots lines, computes totals, derives dates and returns the invoice number', async () => {
    const repo = new FakeWriteRepo(true);
    const result = await build(repo).execute(command());

    // subtotal 90,000,000; 5% discount 4,500,000; base 85,500,000; VAT 7.5% 6,412,500
    expect(result.invoiceNumber).toBe('INV-2026-451');
    expect(result.status).toBe('PENDING');
    expect(result.subtotalMinor).toBe(90_000_000);
    expect(result.discountTotalMinor).toBe(4_500_000);
    expect(result.taxMinor).toBe(6_412_500);
    expect(result.totalMinor).toBe(91_912_500);
    expect(result.issueDate).toBe('2026-07-31T00:00:00.000Z');
    expect(result.dueDate).toBe('2026-08-30T00:00:00.000Z'); // issue + 30 days (settings default)

    const saved = repo.created as unknown as NewInvoice;
    expect(saved.amountMinor).toBe(91_912_500);
    expect(saved.lines[0]).toMatchObject({
      serviceName: 'Specialist Nursing Support',
      rateMinor: 1_500_000,
      quantity: 60,
      unitLabel: 'hr',
      amountMinor: 90_000_000,
      // Category is snapshotted from the catalog; dates and caregiver from the line.
      category: 'Nursing',
      caregiverId: '7a3d1e2c-0000-4000-8000-000000000001',
    });
    expect(saved.lines[0].serviceDateStart?.toISOString()).toBe('2026-07-01T00:00:00.000Z');
    expect(saved.adjustments[0]).toMatchObject({
      kind: 'DISCOUNT',
      label: 'Loyalty Discount',
      amountMinor: -4_500_000,
    });
  });

  it('honours an explicit payment terms override', async () => {
    const repo = new FakeWriteRepo(true);
    const result = await build(repo).execute(command({ paymentTermsDays: 14 }));
    expect(result.dueDate).toBe('2026-08-14T00:00:00.000Z');
  });

  it('rejects an empty line set', async () => {
    await expect(
      build(new FakeWriteRepo(true)).execute(command({ lines: [] })),
    ).rejects.toBeInstanceOf(ValidationException);
  });

  it('rejects a period whose end precedes its start', async () => {
    await expect(
      build(new FakeWriteRepo(true)).execute(
        command({
          periodStart: new Date('2026-07-31T00:00:00.000Z'),
          periodEnd: new Date('2026-07-01T00:00:00.000Z'),
        }),
      ),
    ).rejects.toBeInstanceOf(ValidationException);
  });

  it('throws when the recipient does not exist', async () => {
    await expect(build(new FakeWriteRepo(false)).execute(command())).rejects.toBeInstanceOf(
      NotFoundDomainException,
    );
  });

  it('rejects an unknown service', async () => {
    await expect(
      build(new FakeWriteRepo(true)).execute(
        command({ lines: [{ serviceId: 'missing', quantity: 1 }] }),
      ),
    ).rejects.toBeInstanceOf(ValidationException);
  });
});
