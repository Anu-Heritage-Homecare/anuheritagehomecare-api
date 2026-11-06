import { Currency } from '@shared/domain/currency.enum';
import { NotFoundDomainException, ValidationException } from '@shared/domain/domain-exception';
import { BillingPaymentMethodSetting } from '../../domain/billing-payment-method.entity';
import { BillingSettings } from '../../domain/billing-settings.entity';
import { BillingSettingsRepository } from '../../domain/billing-settings.repository';
import {
  BillableServiceView,
  BillableServicesCatalogReadModel,
} from '../ports/billable-services-read.port';
import { InvoiceWizardReadModel, RenderedCareView } from '../ports/invoice-wizard-read.port';
import { GetRenderedServicesUseCase } from './get-rendered-services.use-case';

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

function wizard(care: RenderedCareView | null): InvoiceWizardReadModel {
  return {
    accountPreview: () => Promise.reject(new Error('unused')),
    recipientServicePreview: () => Promise.reject(new Error('unused')),
    renderedCare: () => Promise.resolve(care),
  };
}

const SERVICES: BillableServiceView[] = [
  {
    id: 's1',
    code: 'PERSONAL_CARE_SUPPORT',
    name: 'Personal Care Support',
    description: 'Hourly Care Plan Support Tasks',
    category: null,
    unit: 'HOURLY',
    rateMinor: 1_500_000,
  },
  {
    id: 's2',
    code: 'PHYSIOTHERAPY_SESSIONS',
    name: 'Physiotherapy Sessions',
    description: 'Specialised motor and movement rehabilitation',
    category: null,
    unit: 'SESSION',
    rateMinor: 2_500_000,
  },
  {
    id: 's3',
    code: 'NOT_PRICED',
    name: 'Unpriced Service',
    description: 'Not priced for this market',
    category: null,
    unit: 'HOURLY',
    rateMinor: null,
  },
];

const FROM = new Date('2026-07-01T00:00:00.000Z');
const TO = new Date('2026-07-31T00:00:00.000Z');

describe('GetRenderedServicesUseCase', () => {
  it('pre fills quantities and amounts from the rendered care', async () => {
    const care: RenderedCareView = {
      visits: [
        {
          visitType: 'PERSONAL_CARE',
          clockInAt: null,
          clockOutAt: null,
          startMinute: 540,
          endMinute: 660, // 2h
          breakMinutes: 0,
        },
        {
          visitType: 'PHYSICAL_THERAPY',
          clockInAt: null,
          clockOutAt: null,
          startMinute: 540,
          endMinute: 600,
          breakMinutes: 0,
        },
      ],
    };

    const result = await new GetRenderedServicesUseCase(
      catalog(SERVICES),
      wizard(care),
      settingsRepo(null),
    ).execute({ recipientId: 'r1', currency: Currency.NigerianNaira, from: FROM, to: TO });

    expect(result.currency).toBe('NGN');
    expect(result.taxRatePercent).toBe(7.5);
    expect(result.periodStart).toBe(FROM.toISOString());

    const personal = result.services.find((s) => s.code === 'PERSONAL_CARE_SUPPORT');
    expect(personal).toMatchObject({ suggestedQuantity: 2, amountMinor: 3_000_000 });

    const physio = result.services.find((s) => s.code === 'PHYSIOTHERAPY_SESSIONS');
    expect(physio).toMatchObject({ suggestedQuantity: 1, amountMinor: 2_500_000 });
  });

  it('returns a zero amount for a service not priced for the market', async () => {
    const result = await new GetRenderedServicesUseCase(
      catalog(SERVICES),
      wizard({ visits: [] }),
      settingsRepo(null),
    ).execute({ recipientId: 'r1', currency: Currency.NigerianNaira, from: FROM, to: TO });

    const unpriced = result.services.find((s) => s.code === 'NOT_PRICED');
    expect(unpriced).toMatchObject({ rateMinor: null, suggestedQuantity: 0, amountMinor: 0 });
  });

  it('throws when the recipient is unknown', async () => {
    await expect(
      new GetRenderedServicesUseCase(catalog(SERVICES), wizard(null), settingsRepo(null)).execute({
        recipientId: 'missing',
        currency: Currency.NigerianNaira,
        from: FROM,
        to: TO,
      }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });

  it('rejects a period whose end precedes its start', async () => {
    await expect(
      new GetRenderedServicesUseCase(
        catalog(SERVICES),
        wizard({ visits: [] }),
        settingsRepo(null),
      ).execute({ recipientId: 'r1', currency: Currency.NigerianNaira, from: TO, to: FROM }),
    ).rejects.toBeInstanceOf(ValidationException);
  });
});
