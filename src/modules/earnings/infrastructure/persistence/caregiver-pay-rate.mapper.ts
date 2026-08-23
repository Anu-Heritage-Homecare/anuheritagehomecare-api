import {
  CaregiverPayRate as PrismaCaregiverPayRate,
  Currency as PrismaCurrency,
} from '@prisma/client';
import { Currency } from '@shared/domain/currency.enum';
import { CaregiverPayRate } from '../../domain/caregiver-pay-rate.entity';

/**
 * Translates between the Prisma CaregiverPayRate row and the entity. The only
 * place that knows both shapes, so the domain stays free of Prisma types.
 */
export class CaregiverPayRateMapper {
  static toDomain(row: PrismaCaregiverPayRate): CaregiverPayRate {
    return CaregiverPayRate.rehydrate(row.id, {
      caregiverId: row.caregiverId,
      currency: CaregiverPayRateMapper.TO_DOMAIN_CURRENCY[row.currency],
      hourlyRateMinor: row.hourlyRateMinor,
      overtimeMultiplierBps: row.overtimeMultiplierBps,
      regularHoursCap: row.regularHoursCap,
      weekendBonusMinor: row.weekendBonusMinor,
      taxRateBps: row.taxRateBps,
    });
  }

  private static readonly TO_DOMAIN_CURRENCY: Record<PrismaCurrency, Currency> = {
    USD: Currency.UnitedStatesDollar,
    NGN: Currency.NigerianNaira,
  };
}
