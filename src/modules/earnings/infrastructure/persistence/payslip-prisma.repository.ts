import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { Payslip } from '../../domain/payslip.entity';
import { PayslipRepository } from '../../domain/payslip.repository';
import { PayslipMapper } from './payslip.mapper';

/**
 * Prisma backed adapter for the PayslipRepository port. Saving upserts on the
 * caregiver and period start unique key, so re-running a period overwrites the
 * slip rather than duplicating it. History is listed newest period first.
 */
@Injectable()
export class PayslipPrismaRepository implements PayslipRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(payslip: Payslip): Promise<void> {
    const row = PayslipMapper.toPersistence(payslip);
    const { id: _id, caregiverId, periodStart, ...mutable } = row;
    await this.prisma.payslip.upsert({
      where: { caregiverId_periodStart: { caregiverId, periodStart } },
      create: row,
      update: mutable,
    });
  }

  async findById(id: string): Promise<Payslip | null> {
    const row = await this.prisma.payslip.findUnique({ where: { id } });
    return row ? PayslipMapper.toDomain(row) : null;
  }

  async listForCaregiver(caregiverId: string): Promise<Payslip[]> {
    const rows = await this.prisma.payslip.findMany({
      where: { caregiverId },
      orderBy: { periodStart: 'desc' },
    });
    return rows.map((row) => PayslipMapper.toDomain(row));
  }
}
