import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { SosAlert } from '../../domain/sos-alert.entity';
import { SosAlertRepository } from '../../domain/sos-alert.repository';
import { SosAlertMapper } from './sos-alert.mapper';

/** Prisma backed adapter for the SosAlertRepository port. */
@Injectable()
export class SosAlertPrismaRepository implements SosAlertRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(alert: SosAlert): Promise<void> {
    const row = SosAlertMapper.toPersistence(alert);
    await this.prisma.sosAlert.upsert({
      where: { id: row.id },
      create: row,
      update: { status: row.status, cancelledAt: row.cancelledAt },
    });
  }

  async findById(id: string): Promise<SosAlert | null> {
    const row = await this.prisma.sosAlert.findUnique({ where: { id } });
    return row ? SosAlertMapper.toDomain(row) : null;
  }
}
