import { Injectable } from '@nestjs/common';
import { BillingTax as PrismaBillingTax, TaxScope as PrismaTaxScope } from '@prisma/client';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { BillingTax } from '../../domain/billing-tax.entity';
import { BillingTaxRepository } from '../../domain/billing-tax.repository';
import { TaxScope } from '../../domain/tax-scope.enum';

const TO_DOMAIN_SCOPE: Record<PrismaTaxScope, TaxScope> = {
  CLIENT_INVOICE: TaxScope.ClientInvoice,
  CONTRACTOR_PAYOUT: TaxScope.ContractorPayout,
};
const TO_PRISMA_SCOPE: Record<TaxScope, PrismaTaxScope> = {
  [TaxScope.ClientInvoice]: 'CLIENT_INVOICE',
  [TaxScope.ContractorPayout]: 'CONTRACTOR_PAYOUT',
};

/** Prisma backed adapter for the BillingTaxRepository port. */
@Injectable()
export class BillingTaxPrismaRepository implements BillingTaxRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<BillingTax[]> {
    const rows = await this.prisma.billingTax.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return rows.map((row) => BillingTaxPrismaRepository.toDomain(row));
  }

  async findById(id: string): Promise<BillingTax | null> {
    const row = await this.prisma.billingTax.findUnique({ where: { id } });
    return row ? BillingTaxPrismaRepository.toDomain(row) : null;
  }

  async save(tax: BillingTax): Promise<void> {
    const data = {
      name: tax.name,
      rateBasisPoints: tax.rateBasisPoints,
      scope: TO_PRISMA_SCOPE[tax.scope],
      isActive: tax.isActive,
      description: tax.description,
      sortOrder: tax.sortOrder,
      updatedAt: tax.updatedAt,
    };
    await this.prisma.billingTax.upsert({
      where: { id: tax.id },
      create: { id: tax.id, createdAt: tax.createdAt, ...data },
      update: data,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.billingTax.delete({ where: { id } });
  }

  private static toDomain(row: PrismaBillingTax): BillingTax {
    return BillingTax.rehydrate(row.id, {
      name: row.name,
      rateBasisPoints: row.rateBasisPoints,
      scope: TO_DOMAIN_SCOPE[row.scope],
      isActive: row.isActive,
      description: row.description,
      sortOrder: row.sortOrder,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
