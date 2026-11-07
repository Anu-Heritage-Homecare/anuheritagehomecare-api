import { Currency } from '@shared/domain/currency.enum';
import { ValidationException } from '@shared/domain/domain-exception';
import { BillingPaymentMethodKind } from '../../domain/billing-payment-method-kind.enum';
import { BillingPaymentMethodSetting } from '../../domain/billing-payment-method.entity';
import { BillingSettings } from '../../domain/billing-settings.entity';
import { BillingSettingsRepository } from '../../domain/billing-settings.repository';
import { GetBillingSettingsUseCase } from './get-billing-settings.use-case';
import { UpdateBillingSettingsUseCase } from './update-billing-settings.use-case';
import { UpdatePaymentMethodUseCase } from './update-payment-method.use-case';

class FakeRepo implements BillingSettingsRepository {
  settings: BillingSettings | null = null;
  methods = new Map<BillingPaymentMethodKind, BillingPaymentMethodSetting>();

  load(): Promise<BillingSettings | null> {
    return Promise.resolve(this.settings);
  }
  save(settings: BillingSettings): Promise<void> {
    this.settings = settings;
    return Promise.resolve();
  }
  loadPaymentMethods(): Promise<BillingPaymentMethodSetting[]> {
    return Promise.resolve([...this.methods.values()]);
  }
  loadPaymentMethod(method: BillingPaymentMethodKind): Promise<BillingPaymentMethodSetting | null> {
    return Promise.resolve(this.methods.get(method) ?? null);
  }
  savePaymentMethod(method: BillingPaymentMethodSetting): Promise<void> {
    this.methods.set(method.method, method);
    return Promise.resolve();
  }
}

describe('BillingSettings entity', () => {
  it('exposes the documented defaults', () => {
    const p = BillingSettings.createDefault().snapshot();
    expect(p.invoicePrefix).toBe('INV-');
    expect(p.standardTaxRateBasisPoints).toBe(750);
    expect(p.defaultPaymentTermsDays).toBe(30);
    expect(p.autoNumbering).toBe(true);
  });

  it('applies a patch, trims the prefix and ignores undefined fields', () => {
    const settings = BillingSettings.createDefault();
    settings.apply({ invoicePrefix: '  AHH-  ', emailNotifications: false });
    const p = settings.snapshot();
    expect(p.invoicePrefix).toBe('AHH-');
    expect(p.emailNotifications).toBe(false);
    expect(p.autoNumbering).toBe(true); // untouched
  });

  it('rejects an out of range value', () => {
    expect(() => BillingSettings.createDefault().apply({ invoicePrefix: '' })).toThrow(
      ValidationException,
    );
    expect(() => BillingSettings.createDefault().apply({ defaultPaymentTermsDays: 0 })).toThrow(
      ValidationException,
    );
    expect(() =>
      BillingSettings.createDefault().apply({ standardTaxRateBasisPoints: 20_000 }),
    ).toThrow(ValidationException);
  });
});

describe('BillingPaymentMethodSetting entity', () => {
  it('defaults to enabled with the avenue description', () => {
    const method = BillingPaymentMethodSetting.createDefault(BillingPaymentMethodKind.Card);
    expect(method.enabled).toBe(true);
    expect(method.description).toBe('Paystack integration active');
  });

  it('rejects a blank description', () => {
    expect(() =>
      BillingPaymentMethodSetting.createDefault(BillingPaymentMethodKind.Cash).apply({
        description: '   ',
      }),
    ).toThrow(ValidationException);
  });
});

describe('GetBillingSettingsUseCase', () => {
  it('returns the defaults and all four avenues when nothing is saved', async () => {
    const result = await new GetBillingSettingsUseCase(new FakeRepo()).execute();
    expect(result.invoice.standardTaxRatePercent).toBe(7.5);
    expect(result.invoice.invoicePrefix).toBe('INV-');
    expect(result.paymentMethods).toHaveLength(4);
    expect(result.paymentMethods.every((m) => m.enabled)).toBe(true);
  });
});

describe('UpdateBillingSettingsUseCase', () => {
  it('converts the tax percent to basis points, persists and echoes the result', async () => {
    const repo = new FakeRepo();
    const result = await new UpdateBillingSettingsUseCase(repo).execute({
      standardTaxRatePercent: 10,
      invoicePrefix: 'AHH-',
      defaultCurrency: Currency.UnitedStatesDollar,
      smsNotifications: false,
    });

    expect(result.invoice.standardTaxRatePercent).toBe(10);
    expect(result.invoice.invoicePrefix).toBe('AHH-');
    expect(result.invoice.defaultCurrency).toBe('USD');
    expect(result.notifications.sms).toBe(false);
    expect(result.automation.autoReceipts).toBe(true); // untouched default
    expect(repo.settings?.snapshot().standardTaxRateBasisPoints).toBe(1_000);
  });

  it('saves the company profile and echoes it, clearing a blanked field', async () => {
    const repo = new FakeRepo();
    const saved = await new UpdateBillingSettingsUseCase(repo).execute({
      companyName: 'CareProfs Medical Ltd',
      companyAddress: '12 Medical Road, Ikeja, Lagos, Nigeria',
      bankName: 'First Bank',
      bankAccountNumber: '1029302910',
    });
    expect(saved.company).toMatchObject({
      companyName: 'CareProfs Medical Ltd',
      bankName: 'First Bank',
      bankAccountNumber: '1029302910',
      bankAccountName: null,
    });

    const cleared = await new UpdateBillingSettingsUseCase(repo).execute({ companyName: '  ' });
    expect(cleared.company.companyName).toBeNull();
    expect(cleared.company.bankName).toBe('First Bank'); // untouched
  });
});

describe('UpdatePaymentMethodUseCase', () => {
  it('disables an avenue, keeping its default description, and persists it', async () => {
    const repo = new FakeRepo();
    const result = await new UpdatePaymentMethodUseCase(repo).execute({
      method: BillingPaymentMethodKind.Card,
      enabled: false,
    });

    expect(result.enabled).toBe(false);
    expect(result.description).toBe('Paystack integration active');
    expect(repo.methods.get(BillingPaymentMethodKind.Card)?.enabled).toBe(false);
  });
});
