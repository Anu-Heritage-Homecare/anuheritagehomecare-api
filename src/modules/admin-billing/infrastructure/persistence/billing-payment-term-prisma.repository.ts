import { Injectable } from '@nestjs/common';
import { BillingPaymentTerm as PrismaTerm } from '@prisma/client';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { BillingPaymentTerm } from '../../domain/billing-payment-term.entity';
import { BillingPaymentTermRepository } from '../../domain/billing-payment-term.repository';

/** Prisma backed adapter for the BillingPaymentTermRepository port. */
@Injectable()
export class BillingPaymentTermPrismaRepository implements BillingPaymentTermRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<BillingPaymentTerm[]> {
    const rows = await this.prisma.billingPaymentTerm.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return rows.map((row) => BillingPaymentTermPrismaRepository.toDomain(row));
  }

  async findById(id: string): Promise<BillingPaymentTerm | null> {
    const row = await this.prisma.billingPaymentTerm.findUnique({ where: { id } });
    return row ? BillingPaymentTermPrismaRepository.toDomain(row) : null;
  }

  async save(term: BillingPaymentTerm): Promise<void> {
    const data = BillingPaymentTermPrismaRepository.fields(term);
    await this.prisma.billingPaymentTerm.upsert({
      where: { id: term.id },
      create: { id: term.id, createdAt: term.createdAt, ...data },
      update: data,
    });
  }

  async saveMany(terms: BillingPaymentTerm[]): Promise<void> {
    await this.prisma.$transaction(
      terms.map((term) => {
        const data = BillingPaymentTermPrismaRepository.fields(term);
        return this.prisma.billingPaymentTerm.upsert({
          where: { id: term.id },
          create: { id: term.id, createdAt: term.createdAt, ...data },
          update: data,
        });
      }),
    );
  }

  async delete(id: string): Promise<void> {
    await this.prisma.billingPaymentTerm.delete({ where: { id } });
  }

  private static fields(term: BillingPaymentTerm): {
    name: string;
    netDays: number | null;
    isDefault: boolean;
    isActive: boolean;
    isCustom: boolean;
    description: string | null;
    sortOrder: number;
    updatedAt: Date;
  } {
    return {
      name: term.name,
      netDays: term.netDays,
      isDefault: term.isDefault,
      isActive: term.isActive,
      isCustom: term.isCustom,
      description: term.description,
      sortOrder: term.sortOrder,
      updatedAt: term.updatedAt,
    };
  }

  private static toDomain(row: PrismaTerm): BillingPaymentTerm {
    return BillingPaymentTerm.rehydrate(row.id, {
      name: row.name,
      netDays: row.netDays,
      isDefault: row.isDefault,
      isActive: row.isActive,
      isCustom: row.isCustom,
      description: row.description,
      sortOrder: row.sortOrder,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
