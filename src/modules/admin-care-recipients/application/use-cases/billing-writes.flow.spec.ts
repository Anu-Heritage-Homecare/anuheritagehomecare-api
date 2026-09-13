import { CareRecipient } from '@modules/care-recipients/domain/care-recipient.entity';
import { CareRecipientRepository } from '@modules/care-recipients/domain/care-recipient.repository';
import { User } from '@modules/identity/domain/user.entity';
import { UserRepository } from '@modules/identity/domain/user.repository';
import { BillingProfile } from '@modules/recipient-billing/domain/billing-profile.entity';
import { BillingProfileRepository } from '@modules/recipient-billing/domain/billing-profile.repository';
import { InvoiceLine } from '@modules/recipient-billing/domain/invoice-line.entity';
import { InvoicePayment } from '@modules/recipient-billing/domain/invoice-payment.entity';
import { InvoicePaymentRepository } from '@modules/recipient-billing/domain/invoice-payment.repository';
import { InvoiceStatus } from '@modules/recipient-billing/domain/invoice-status.enum';
import { Invoice } from '@modules/recipient-billing/domain/invoice.entity';
import { InvoiceRepository } from '@modules/recipient-billing/domain/invoice.repository';
import { Currency } from '@shared/domain/currency.enum';
import { Clock } from '@shared/application/ports/clock.port';
import { IdGenerator } from '@shared/application/ports/id-generator.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { CreateInvoiceUseCase } from './create-invoice.use-case';
import { RecordInvoicePaymentUseCase } from './record-invoice-payment.use-case';
import { SetBillingProfileUseCase } from './set-billing-profile.use-case';

const NOW = new Date('2026-07-24T00:00:00.000Z');
const clock: Clock = { now: () => NOW };
const R = 'r1';

function ids(): IdGenerator {
  let n = 0;
  return { generate: () => `id-${(n += 1)}` };
}

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

function users(): UserRepository {
  const owner = { address: { country: 'NG' } } as unknown as User;
  return {
    save: () => Promise.resolve(),
    findById: () => Promise.resolve(owner),
    findByIds: () => Promise.resolve([]),
    findByEmail: () => Promise.resolve(null),
    existsByEmail: () => Promise.resolve(false),
    existsByPhone: () => Promise.resolve(false),
    countByType: () => Promise.resolve(0),
  };
}

class InvoiceStore implements InvoiceRepository {
  public items: Invoice[] = [];
  add(invoice: Invoice): Promise<void> {
    this.items.push(invoice);
    return Promise.resolve();
  }
  save(invoice: Invoice): Promise<void> {
    const index = this.items.findIndex((i) => i.id === invoice.id);
    if (index !== -1) {
      this.items[index] = invoice;
    }
    return Promise.resolve();
  }
  findById(id: string): Promise<Invoice | null> {
    return Promise.resolve(this.items.find((i) => i.id === id) ?? null);
  }
}

class PaymentStore implements InvoicePaymentRepository {
  public items: InvoicePayment[] = [];
  add(payment: InvoicePayment): Promise<void> {
    this.items.push(payment);
    return Promise.resolve();
  }
}

class ProfileStore implements BillingProfileRepository {
  public profile: BillingProfile | null = null;
  findByRecipient(): Promise<BillingProfile | null> {
    return Promise.resolve(this.profile);
  }
  save(profile: BillingProfile): Promise<void> {
    this.profile = profile;
    return Promise.resolve();
  }
}

function pendingInvoice(id: string): Invoice {
  return Invoice.issue({
    id,
    careRecipientId: R,
    periodStart: new Date('2026-07-01T00:00:00.000Z'),
    periodEnd: new Date('2026-07-15T00:00:00.000Z'),
    servicesLabel: 'Care',
    currency: Currency.NigerianNaira,
    insuranceCoveredMinor: 360_000,
    lines: [InvoiceLine.create({ id: 'l1', serviceName: 'Morning Care', amountMinor: 450_000 })],
    now: NOW,
  });
}

describe('billing admin writes', () => {
  it('issues an invoice with currency derived from the owner country', async () => {
    const invoices = new InvoiceStore();
    const useCase = new CreateInvoiceUseCase(recipients(true), users(), invoices, clock, ids());

    const { id } = await useCase.execute({
      recipientId: R,
      periodStart: new Date('2026-07-01T00:00:00.000Z'),
      periodEnd: new Date('2026-07-15T00:00:00.000Z'),
      servicesLabel: 'Morning + Afternoon Care (15 visits)',
      insuranceCoveredMinor: 360_000,
      lines: [
        { serviceName: 'Morning Care', amountMinor: 300_000 },
        { serviceName: 'Afternoon Care', amountMinor: 150_000 },
      ],
    });

    expect(invoices.items).toHaveLength(1);
    expect(invoices.items[0].id).toBe(id);
    expect(invoices.items[0].currency).toBe(Currency.NigerianNaira);
    expect(invoices.items[0].amountMinor).toBe(450_000);
    expect(invoices.items[0].patientDueMinor).toBe(90_000);
  });

  it('rejects issuing an invoice for an unknown recipient', async () => {
    const useCase = new CreateInvoiceUseCase(
      recipients(false),
      users(),
      new InvoiceStore(),
      clock,
      ids(),
    );
    await expect(
      useCase.execute({
        recipientId: 'nope',
        periodStart: NOW,
        periodEnd: NOW,
        servicesLabel: 'x',
        insuranceCoveredMinor: 0,
        lines: [{ serviceName: 'Care', amountMinor: 100 }],
      }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });

  it('records a payment covering the patient due and marks the invoice paid', async () => {
    const invoices = new InvoiceStore();
    invoices.items.push(pendingInvoice('inv1'));
    const payments = new PaymentStore();
    const useCase = new RecordInvoicePaymentUseCase(invoices, payments, clock, ids());

    await useCase.execute({
      recipientId: R,
      invoiceId: 'inv1',
      amountMinor: 90_000,
      methodLabel: 'Visa ****4521 (Auto-pay)',
    });

    expect(payments.items).toHaveLength(1);
    expect(payments.items[0].currency).toBe(Currency.NigerianNaira);
    expect((await invoices.findById('inv1'))?.status).toBe(InvoiceStatus.Paid);
  });

  it('leaves an invoice pending on a partial payment', async () => {
    const invoices = new InvoiceStore();
    invoices.items.push(pendingInvoice('inv1'));
    const useCase = new RecordInvoicePaymentUseCase(invoices, new PaymentStore(), clock, ids());
    await useCase.execute({ recipientId: R, invoiceId: 'inv1', amountMinor: 50_000 });
    expect((await invoices.findById('inv1'))?.status).toBe(InvoiceStatus.Pending);
  });

  it('rejects a payment for an invoice of another recipient', async () => {
    const invoices = new InvoiceStore();
    invoices.items.push(pendingInvoice('inv1'));
    const useCase = new RecordInvoicePaymentUseCase(invoices, new PaymentStore(), clock, ids());
    await expect(
      useCase.execute({ recipientId: 'other', invoiceId: 'inv1', amountMinor: 1000 }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });

  it('upserts the billing profile, deriving the co-pay currency', async () => {
    const store = new ProfileStore();
    const useCase = new SetBillingProfileUseCase(recipients(true), users(), store, clock, ids());

    await useCase.execute({
      recipientId: R,
      billingContactName: 'David Johnson',
      primaryInsuranceProvider: 'MedCare Plus',
      coPayPerVisitMinor: 5000,
    });

    expect(store.profile?.billingContactName).toBe('David Johnson');
    expect(store.profile?.coPayCurrency).toBe(Currency.NigerianNaira);
  });
});
