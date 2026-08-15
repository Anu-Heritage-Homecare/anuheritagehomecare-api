import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { PaymentMethod } from '../../domain/payment-method.entity';
import { PaymentMethodRepository } from '../../domain/payment-method.repository';
import { PaymentMethodMapper } from './payment-method.mapper';

/** Prisma backed adapter for the PaymentMethodRepository port. */
@Injectable()
export class PaymentMethodPrismaRepository implements PaymentMethodRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(method: PaymentMethod): Promise<void> {
    const row = PaymentMethodMapper.toPersistence(method);
    await this.prisma.paymentMethod.upsert({
      where: { id: row.id },
      create: row,
      update: {
        providerCustomerRef: row.providerCustomerRef,
        providerMethodRef: row.providerMethodRef,
        brand: row.brand,
        last4: row.last4,
        expMonth: row.expMonth,
        expYear: row.expYear,
        isDefault: row.isDefault,
      },
    });
  }

  async listByOwner(ownerId: string): Promise<PaymentMethod[]> {
    const rows = await this.prisma.paymentMethod.findMany({
      where: { ownerId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
    return rows.map((row) => PaymentMethodMapper.toDomain(row));
  }
}
