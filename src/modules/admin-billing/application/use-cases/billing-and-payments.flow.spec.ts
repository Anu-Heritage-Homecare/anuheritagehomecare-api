import { Clock } from '@shared/application/ports/clock.port';
import { IdGenerator } from '@shared/application/ports/id-generator.port';
import { NotFoundDomainException, ValidationException } from '@shared/domain/domain-exception';
import { BillingPaymentMethodKind } from '../../domain/billing-payment-method-kind.enum';
import { BillingPaymentMethodSetting } from '../../domain/billing-payment-method.entity';
import { BillingSettings } from '../../domain/billing-settings.entity';
import { BillingSettingsRepository } from '../../domain/billing-settings.repository';
import { BillingTax } from '../../domain/billing-tax.entity';
import { BillingTaxRepository } from '../../domain/billing-tax.repository';
import { BillingPaymentTerm } from '../../domain/billing-payment-term.entity';
import { BillingPaymentTermRepository } from '../../domain/billing-payment-term.repository';
import { TaxScope } from '../../domain/tax-scope.enum';
import { InvoiceNumberPreviewPort } from '../ports/invoice-number-preview.port';
import { CreateTaxUseCase, DeleteTaxUseCase, UpdateTaxUseCase } from './billing-tax.use-cases';
import {
  CreatePaymentTermUseCase,
  UpdatePaymentTermUseCase,
} from './billing-payment-term.use-cases';
import { GetBillingAndPaymentsUseCase } from './get-billing-and-payments.use-case';
import { GetBillingSettingsUseCase } from './get-billing-settings.use-case';

const NOW = new Date('2026-11-09T09:00:00.000Z');
const clock: Clock = { now: () => NOW };

function sequentialIds(prefix = 'id'): IdGenerator {
  let n = 0;
  return {
    generate: () => {
      n += 1;
      return `${prefix}-${n}`;
    },
  };
}

class FakeSettingsRepo implements BillingSettingsRepository {
  settings: BillingSettings | null = null;
  methods: BillingPaymentMethodSetting[] = [];
  load(): Promise<BillingSettings | null> {
    return Promise.resolve(this.settings);
  }
  save(settings: BillingSettings): Promise<void> {
    this.settings = settings;
    return Promise.resolve();
  }
  loadPaymentMethods(): Promise<BillingPaymentMethodSetting[]> {
    return Promise.resolve(this.methods);
  }
  loadPaymentMethod(method: BillingPaymentMethodKind): Promise<BillingPaymentMethodSetting | null> {
    return Promise.resolve(this.methods.find((m) => m.method === method) ?? null);
  }
  savePaymentMethod(method: BillingPaymentMethodSetting): Promise<void> {
    this.methods = [...this.methods.filter((m) => m.method !== method.method), method];
    return Promise.resolve();
  }
}

class FakeTaxRepo implements BillingTaxRepository {
  store = new Map<string, BillingTax>();
  list(): Promise<BillingTax[]> {
    return Promise.resolve([...this.store.values()]);
  }
  findById(id: string): Promise<BillingTax | null> {
    return Promise.resolve(this.store.get(id) ?? null);
  }
  save(tax: BillingTax): Promise<void> {
    this.store.set(tax.id, tax);
    return Promise.resolve();
  }
  delete(id: string): Promise<void> {
    this.store.delete(id);
    return Promise.resolve();
  }
}

class FakeTermRepo implements BillingPaymentTermRepository {
  store = new Map<string, BillingPaymentTerm>();
  list(): Promise<BillingPaymentTerm[]> {
    return Promise.resolve([...this.store.values()]);
  }
  findById(id: string): Promise<BillingPaymentTerm | null> {
    return Promise.resolve(this.store.get(id) ?? null);
  }
  save(term: BillingPaymentTerm): Promise<void> {
    this.store.set(term.id, term);
    return Promise.resolve();
  }
  saveMany(terms: BillingPaymentTerm[]): Promise<void> {
    for (const term of terms) {
      this.store.set(term.id, term);
    }
    return Promise.resolve();
  }
  delete(id: string): Promise<void> {
    this.store.delete(id);
    return Promise.resolve();
  }
}

class FakePreview implements InvoiceNumberPreviewPort {
  constructor(private readonly value: number) {}
  nextSequence(): Promise<number> {
    return Promise.resolve(this.value);
  }
}

describe('Billing & Payments flows', () => {
  let settingsRepo: FakeSettingsRepo;
  let taxes: FakeTaxRepo;
  let terms: FakeTermRepo;
  let screen: GetBillingAndPaymentsUseCase;

  beforeEach(() => {
    settingsRepo = new FakeSettingsRepo();
    taxes = new FakeTaxRepo();
    terms = new FakeTermRepo();
    screen = new GetBillingAndPaymentsUseCase(
      new GetBillingSettingsUseCase(settingsRepo),
      taxes,
      terms,
      new FakePreview(458),
      clock,
    );
  });

  it('assembles the screen with the next invoice number and default settings', async () => {
    const result = await screen.execute();
    expect(result.nextInvoiceNumber).toBe('2026-458');
    expect(result.invoice.includeVatInPricing).toBe(true);
    expect(result.defaultPaymentMethod).toBeNull();
    expect(result.taxes).toEqual([]);
    expect(result.paymentTerms).toEqual([]);
  });

  it('adds a tax, converting percent to basis points', async () => {
    const result = await new CreateTaxUseCase(taxes, screen, clock, sequentialIds('tax')).execute({
      name: 'VAT',
      ratePercent: 7.5,
      scope: TaxScope.ClientInvoice,
    });
    expect(result.taxes[0].ratePercent).toBe(7.5);
    expect([...taxes.store.values()][0].rateBasisPoints).toBe(750);
  });

  it('edits and deletes a tax, raising when missing', async () => {
    const created = await new CreateTaxUseCase(taxes, screen, clock, sequentialIds('tax')).execute({
      name: 'WHT',
      ratePercent: 5,
      scope: TaxScope.ContractorPayout,
    });
    const id = created.taxes[0].id;
    const edited = await new UpdateTaxUseCase(taxes, screen, clock).execute({
      taxId: id,
      isActive: false,
    });
    expect(edited.taxes[0].isActive).toBe(false);
    await new DeleteTaxUseCase(taxes, screen).execute(id);
    expect(taxes.store.size).toBe(0);
    await expect(new DeleteTaxUseCase(taxes, screen).execute(id)).rejects.toBeInstanceOf(
      NotFoundDomainException,
    );
  });

  it('keeps exactly one default payment term', async () => {
    const create = new CreatePaymentTermUseCase(terms, screen, clock, sequentialIds('term'));
    await create.execute({ name: 'Net 15', netDays: 15, isDefault: true });
    const second = await create.execute({ name: 'Net 30', netDays: 30, isDefault: true });
    const defaults = second.paymentTerms.filter((t) => t.isDefault);
    expect(defaults).toHaveLength(1);
    expect(defaults[0].name).toBe('Net 30');
  });

  it('creates a custom term with no net days', async () => {
    const result = await new CreatePaymentTermUseCase(
      terms,
      screen,
      clock,
      sequentialIds('term'),
    ).execute({ name: 'Custom', isCustom: true });
    expect(result.paymentTerms[0].isCustom).toBe(true);
    expect(result.paymentTerms[0].netDays).toBeNull();
  });

  it('rejects a non custom term without net days', async () => {
    await expect(
      new CreatePaymentTermUseCase(terms, screen, clock, sequentialIds('term')).execute({
        name: 'Bad',
      }),
    ).rejects.toBeInstanceOf(ValidationException);
  });

  it('moves the default when another term is made default', async () => {
    const create = new CreatePaymentTermUseCase(terms, screen, clock, sequentialIds('term'));
    const first = await create.execute({ name: 'Net 15', netDays: 15, isDefault: true });
    await create.execute({ name: 'Net 30', netDays: 30 });
    const firstId = first.paymentTerms[0].id;
    const net30Id = [...terms.store.values()].find((t) => t.name === 'Net 30')!.id;
    const result = await new UpdatePaymentTermUseCase(terms, screen, clock).execute({
      termId: net30Id,
      isDefault: true,
    });
    expect(result.paymentTerms.find((t) => t.id === firstId)?.isDefault).toBe(false);
    expect(result.paymentTerms.find((t) => t.id === net30Id)?.isDefault).toBe(true);
  });
});
