import { Currency as PrismaCurrency, Payslip as PrismaPayslip } from '@prisma/client';
import { Currency } from '@shared/domain/currency.enum';
import { Payslip } from '../../domain/payslip.entity';

/**
 * Translates between the Prisma Payslip row and the aggregate. The only place
 * that knows both shapes, so the domain stays free of Prisma types.
 */
export class PayslipMapper {
  static toDomain(row: PrismaPayslip): Payslip {
    return Payslip.rehydrate(row.id, {
      caregiverId: row.caregiverId,
      currency: PayslipMapper.TO_DOMAIN_CURRENCY[row.currency],
      periodStart: row.periodStart,
      periodEnd: row.periodEnd,
      payDay: row.payDay,
      workedMinutes: row.workedMinutes,
      breakdown: {
        regularMinutes: row.regularMinutes,
        regularPayMinor: row.regularPayMinor,
        overtimeMinutes: row.overtimeMinutes,
        overtimePayMinor: row.overtimePayMinor,
        weekendVisits: row.weekendVisits,
        weekendBonusMinor: row.weekendBonusMinor,
        grossMinor: row.grossMinor,
        deductionsMinor: row.deductionsMinor,
        netMinor: row.netMinor,
      },
      issuedAt: row.createdAt,
    });
  }

  static toPersistence(payslip: Payslip): PrismaPayslip {
    const b = payslip.breakdown;
    return {
      id: payslip.id,
      caregiverId: payslip.caregiverId,
      currency: PayslipMapper.TO_PERSISTENCE_CURRENCY[payslip.currency],
      periodStart: payslip.periodStart,
      periodEnd: payslip.periodEnd,
      payDay: payslip.payDay,
      workedMinutes: payslip.workedMinutes,
      regularMinutes: b.regularMinutes,
      regularPayMinor: b.regularPayMinor,
      overtimeMinutes: b.overtimeMinutes,
      overtimePayMinor: b.overtimePayMinor,
      weekendVisits: b.weekendVisits,
      weekendBonusMinor: b.weekendBonusMinor,
      grossMinor: b.grossMinor,
      deductionsMinor: b.deductionsMinor,
      netMinor: b.netMinor,
      createdAt: payslip.issuedAt,
    };
  }

  private static readonly TO_DOMAIN_CURRENCY: Record<PrismaCurrency, Currency> = {
    USD: Currency.UnitedStatesDollar,
    NGN: Currency.NigerianNaira,
  };

  private static readonly TO_PERSISTENCE_CURRENCY: Record<Currency, PrismaCurrency> = {
    [Currency.UnitedStatesDollar]: 'USD',
    [Currency.NigerianNaira]: 'NGN',
  };
}
