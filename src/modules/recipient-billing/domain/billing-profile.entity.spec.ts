import { Currency } from '@shared/domain/currency.enum';
import { ValidationException } from '@shared/domain/domain-exception';
import { BillingProfile } from './billing-profile.entity';

const NOW = new Date('2026-07-20T00:00:00.000Z');

describe('BillingProfile', () => {
  it('creates a profile, trimming fields and defaulting auto-pay off', () => {
    const profile = BillingProfile.create({
      id: 'bp1',
      careRecipientId: 'r1',
      billingContactName: '  David Johnson ',
      primaryInsuranceProvider: 'MedCare Plus',
      primaryInsuranceCoveragePercent: 80,
      coPayPerVisitMinor: 5000,
      coPayCurrency: Currency.NigerianNaira,
      now: NOW,
    });
    expect(profile.billingContactName).toBe('David Johnson');
    expect(profile.autoPayEnabled).toBe(false);
    expect(profile.primaryInsuranceCoveragePercent).toBe(80);
    expect(profile.coPayCurrency).toBe(Currency.NigerianNaira);
  });

  it('rejects a coverage percent outside 0 to 100', () => {
    expect(() =>
      BillingProfile.create({
        id: 'bp1',
        careRecipientId: 'r1',
        primaryInsuranceCoveragePercent: 120,
        now: NOW,
      }),
    ).toThrow(ValidationException);
  });

  it('rejects a negative co-pay', () => {
    expect(() =>
      BillingProfile.create({
        id: 'bp1',
        careRecipientId: 'r1',
        coPayPerVisitMinor: -1,
        now: NOW,
      }),
    ).toThrow(ValidationException);
  });
});
