import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { Booking } from '../../domain/booking.entity';
import { BookingRepository } from '../../domain/booking.repository';
import { BookingMapper } from './booking.mapper';

/** Prisma backed adapter for the BookingRepository port. */
@Injectable()
export class BookingPrismaRepository implements BookingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(booking: Booking): Promise<void> {
    const row = BookingMapper.toPersistence(booking);
    await this.prisma.booking.upsert({
      where: { id: row.id },
      create: row,
      update: {
        hours: row.hours,
        serviceDate: row.serviceDate,
        startMinute: row.startMinute,
        endMinute: row.endMinute,
        currency: row.currency,
        hourlyRateMinor: row.hourlyRateMinor,
        subtotalMinor: row.subtotalMinor,
        serviceFeeMinor: row.serviceFeeMinor,
        totalMinor: row.totalMinor,
        status: row.status,
        updatedAt: row.updatedAt,
      },
    });
  }

  async findById(id: string): Promise<Booking | null> {
    const row = await this.prisma.booking.findUnique({ where: { id } });
    return row ? BookingMapper.toDomain(row) : null;
  }

  async listByOwner(ownerId: string): Promise<Booking[]> {
    const rows = await this.prisma.booking.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => BookingMapper.toDomain(row));
  }
}
