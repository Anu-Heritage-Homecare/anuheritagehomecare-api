import { Currency as PrismaCurrency } from '@prisma/client';
import { Currency } from '@shared/domain/currency.enum';
import { BillingPaymentMethodSetting } from '../../domain/billing-payment-method.entity';
import { BillingSettings } from '../../domain/billing-settings.entity';
import { BillingSettingsRepository } from '../../domain/billing-settings.repository';
import {
  BillableServiceView,
  BillableServicesCatalogReadModel,
} from '../ports/billable-services-read.port';
import { ListBillableServicesUseCase } from './list-billable-services.use-case';

function catalog(services: BillableServiceView[]): BillableServicesCatalogReadModel {
  return { list: () => Promise.resolve(services) };
}

/** A settings repo whose load returns the given settings (or null for defaults). */
function settingsRepo(settings: BillingSettings | null): BillingSettingsRepository {
  return {
    load: () => Promise.resolve(settings),
    save: () => Promise.resolve(),
    loadPaymentMethods: () => Promise.resolve([]),
    loadPaymentMethod: () => Promise.resolve(null),
    savePaymentMethod: (_method: BillingPaymentMethodSetting) => Promise.resolve(),
  };
}

const SERVICES: BillableServiceView[] = [
  {
    id: 's1',
    code: 'PERSONAL_CARE_SUPPORT',
    name: 'Personal Care Support',
    description: 'Hourly Care Plan Support Tasks',
    unit: 'HOURLY',
    rateMinor: 1_500_000,
  },
  {
    id: 's2',
    code: 'ADMIN_CARE_COORDINATION',
    name: 'Admin and Care Coordination Fee',
    description: 'Quality compliance and caregiver routing',
    unit: 'FIXED',
    rateMinor: 13_000_000,
  },
];

describe('ListBillableServicesUseCase', () => {
  it('returns the catalog with the default tax rate when settings are unset', async () => {
    const result = await new ListBillableServicesUseCase(
      catalog(SERVICES),
      settingsRepo(null),
    ).execute(Currency.NigerianNaira);

    expect(result.currency).toBe('NGN');
    expect(result.taxRatePercent).toBe(7.5); // default 750 bps
    expect(result.services).toHaveLength(2);
    expect(result.services[0]).toMatchObject({
      code: 'PERSONAL_CARE_SUPPORT',
      unit: 'HOURLY',
      rateMinor: 1_500_000,
    });
  });

  it('applies the saved tax rate', async () => {
    const saved = BillingSettings.createDefault();
    saved.apply({ standardTaxRateBasisPoints: 0 });
    const result = await new ListBillableServicesUseCase(
      catalog(SERVICES),
      settingsRepo(saved),
    ).execute(Currency.NigerianNaira);

    expect(result.taxRatePercent).toBe(0);
  });

  it('passes the resolved prisma currency through to the catalog', async () => {
    let captured: PrismaCurrency | null = null;
    const reads: BillableServicesCatalogReadModel = {
      list: (currency) => {
        captured = currency;
        return Promise.resolve(SERVICES);
      },
    };
    await new ListBillableServicesUseCase(reads, settingsRepo(null)).execute(
      Currency.UnitedStatesDollar,
    );
    expect(captured).toBe(PrismaCurrency.USD);
  });
});
