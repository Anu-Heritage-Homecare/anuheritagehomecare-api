import { Injectable } from '@nestjs/common';
import {
  Currency as PrismaCurrency,
  RateUnit as PrismaRateUnit,
  VisitFormat as PrismaVisitFormat,
  VisitFormatRate as PrismaVisitFormatRate,
} from '@prisma/client';
import { Currency } from '@shared/domain/currency.enum';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { RateUnit } from '../../domain/rate-unit.enum';
import { VisitFormat } from '../../domain/visit-format.entity';
import { VisitFormatRepository } from '../../domain/visit-format.repository';

const TO_DOMAIN_CURRENCY: Record<PrismaCurrency, Currency> = {
  USD: Currency.UnitedStatesDollar,
  NGN: Currency.NigerianNaira,
};
const TO_PRISMA_CURRENCY: Record<Currency, PrismaCurrency> = {
  [Currency.UnitedStatesDollar]: 'USD',
  [Currency.NigerianNaira]: 'NGN',
};
const TO_DOMAIN_RATE_UNIT: Record<PrismaRateUnit, RateUnit> = {
  PER_VISIT: RateUnit.PerVisit,
  PER_HOUR: RateUnit.PerHour,
};
const TO_PRISMA_RATE_UNIT: Record<RateUnit, PrismaRateUnit> = {
  [RateUnit.PerVisit]: 'PER_VISIT',
  [RateUnit.PerHour]: 'PER_HOUR',
};

/** Prisma backed adapter for the VisitFormatRepository port. */
@Injectable()
export class VisitFormatPrismaRepository implements VisitFormatRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<VisitFormat[]> {
    const rows = await this.prisma.visitFormat.findMany({
      include: { rates: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return rows.map((row) => VisitFormatPrismaRepository.toDomain(row));
  }

  async findById(id: string): Promise<VisitFormat | null> {
    const row = await this.prisma.visitFormat.findUnique({
      where: { id },
      include: { rates: true },
    });
    return row ? VisitFormatPrismaRepository.toDomain(row) : null;
  }

  async save(format: VisitFormat): Promise<void> {
    const data = {
      name: format.name,
      description: format.description,
      durationMinutes: format.durationMinutes,
      rateUnit: TO_PRISMA_RATE_UNIT[format.rateUnit],
      sortOrder: format.sortOrder,
      isActive: format.isActive,
      updatedAt: format.updatedAt,
    };
    const rates = format.rates.map((rate) => ({
      currency: TO_PRISMA_CURRENCY[rate.currency],
      baseRateMinor: rate.baseRateMinor,
    }));
    await this.prisma.$transaction([
      this.prisma.visitFormat.upsert({
        where: { id: format.id },
        create: { id: format.id, createdAt: format.createdAt, ...data },
        update: data,
      }),
      this.prisma.visitFormatRate.deleteMany({ where: { visitFormatId: format.id } }),
      this.prisma.visitFormatRate.createMany({
        data: rates.map((rate) => ({ visitFormatId: format.id, ...rate })),
      }),
    ]);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.visitFormat.delete({ where: { id } });
  }

  private static toDomain(
    row: PrismaVisitFormat & { rates: PrismaVisitFormatRate[] },
  ): VisitFormat {
    return VisitFormat.rehydrate(row.id, {
      name: row.name,
      description: row.description,
      durationMinutes: row.durationMinutes,
      rateUnit: TO_DOMAIN_RATE_UNIT[row.rateUnit],
      sortOrder: row.sortOrder,
      isActive: row.isActive,
      rates: row.rates.map((rate) => ({
        currency: TO_DOMAIN_CURRENCY[rate.currency],
        baseRateMinor: rate.baseRateMinor,
      })),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
