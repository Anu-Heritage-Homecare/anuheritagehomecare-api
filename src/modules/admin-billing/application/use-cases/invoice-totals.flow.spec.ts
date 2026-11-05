import { Currency } from '@shared/domain/currency.enum';
import { ValidationException } from '@shared/domain/domain-exception';
import { BillingSettings } from '../../domain/billing-settings.entity';
import { BillingPaymentMethodSetting } from '../../domain/billing-payment-method.entity';
import { BillingSettingsRepository } from '../../domain/billing-settings.repository';
import { computeInvoiceTotals } from '../../domain/invoice-totals.calculator';
import {
  BillableServiceView,
  BillableServicesCatalogReadModel,
} from '../ports/billable-services-read.port';
import { ComputeInvoiceTotalsUseCase } from './compute-invoice-totals.use-case';

describe('computeInvoiceTotals', () => {
  it('matches the wizard mockup: 5% discount then 7.5% VAT on the discounted base', () => {
    const totals = computeInvoiceTotals({
      lines: [
        { rateMinor: 1_500_000, quantity: 40 }, // 60,000,000
        { rateMinor: 1_200_000, quantity: 30 }, // 36,000,000
        { rateMinor: 2_500_000, quantity: 8 }, // 20,000,000
        { rateMinor: 800_000, quantity: 20 }, // 16,000,000
        { rateMinor: 13_000_000, quantity: 1 }, // 13,000,000
      ],
      discounts: [{ label: 'Loyalty Discount', kind: 'PERCENT', value: 5 }],
      adjustments: [],
      taxRateBasisPoints: 750,
    });

    expect(totals.subtotalMinor).toBe(145_000_000);
    expect(totals.discountTotalMinor).toBe(7_250_000);
    expect(totals.taxableBaseMinor).toBe(137_750_000);
    expect(totals.vatMinor).toBe(10_331_250);
    expect(totals.totalMinor).toBe(148_081_250);
  });

  it('applies fixed discounts and signed manual adjustments before VAT', () => {
    const totals = computeInvoiceTotals({
      lines: [{ rateMinor: 100_000, quantity: 10 }], // 1,000,000
      discounts: [{ label: 'Promo', kind: 'FIXED', value: 100_000 }],
      adjustments: [{ label: 'Late surcharge', amountMinor: 50_000 }],
      taxRateBasisPoints: 1_000, // 10%
    });
    // base = 1,000,000 - 100,000 + 50,000 = 950,000; vat = 95,000; total = 1,045,000
    expect(totals.taxableBaseMinor).toBe(950_000);
    expect(totals.vatMinor).toBe(95_000);
    expect(totals.totalMinor).toBe(1_045_000);
  });

  it('clamps the taxable base at zero when discounts exceed the subtotal', () => {
    const totals = computeInvoiceTotals({
      lines: [{ rateMinor: 100_000, quantity: 1 }],
      discounts: [{ label: 'Over', kind: 'FIXED', value: 500_000 }],
      adjustments: [],
      taxRateBasisPoints: 750,
    });
    expect(totals.taxableBaseMinor).toBe(0);
    expect(totals.vatMinor).toBe(0);
    expect(totals.totalMinor).toBe(0);
  });

  it('rejects an out of range percentage, negative quantity or tax rate', () => {
    expect(() =>
      computeInvoiceTotals({
        lines: [],
        discounts: [{ label: 'x', kind: 'PERCENT', value: 150 }],
        adjustments: [],
        taxRateBasisPoints: 750,
      }),
    ).toThrow(ValidationException);
    expect(() =>
      computeInvoiceTotals({
        lines: [{ rateMinor: 100, quantity: -1 }],
        discounts: [],
        adjustments: [],
        taxRateBasisPoints: 750,
      }),
    ).toThrow(ValidationException);
    expect(() =>
      computeInvoiceTotals({
        lines: [],
        discounts: [],
        adjustments: [],
        taxRateBasisPoints: 20_000,
      }),
    ).toThrow(ValidationException);
  });
});

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
    code: 'PERSONAL_CARE_SUPPORT',
    name: 'Personal Care Support',
    description: 'x',
    unit: 'HOURLY',
    rateMinor: 1_500_000,
  },
];

describe('ComputeInvoiceTotalsUseCase', () => {
  it('resolves rates from the catalog and the tax rate from settings', async () => {
    const result = await new ComputeInvoiceTotalsUseCase(
      catalog(CATALOG),
      settingsRepo(null),
    ).execute({
      currency: Currency.NigerianNaira,
      lines: [{ serviceId: 's1', quantity: 40 }],
      discounts: [{ label: 'Loyalty Discount', kind: 'PERCENT', value: 5 }],
      adjustments: [],
    });

    expect(result.subtotalMinor).toBe(60_000_000);
    expect(result.discountTotalMinor).toBe(3_000_000);
    expect(result.taxRatePercent).toBe(7.5);
    expect(result.vatMinor).toBe(Math.round((57_000_000 * 750) / 10_000));
  });

  it('rejects a line referencing an unknown or unpriced service', async () => {
    await expect(
      new ComputeInvoiceTotalsUseCase(catalog(CATALOG), settingsRepo(null)).execute({
        currency: Currency.NigerianNaira,
        lines: [{ serviceId: 'missing', quantity: 1 }],
        discounts: [],
        adjustments: [],
      }),
    ).rejects.toBeInstanceOf(ValidationException);
  });
});
