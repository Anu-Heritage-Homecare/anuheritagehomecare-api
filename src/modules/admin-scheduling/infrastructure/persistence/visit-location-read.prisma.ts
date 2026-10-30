import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import {
  VisitLocationPingView,
  VisitLocationReadModel,
} from '../../application/ports/visit-location-read.port';

/** Prisma read model over the tracking location pings for one visit. */
@Injectable()
export class VisitLocationReadPrisma implements VisitLocationReadModel {
  constructor(private readonly prisma: PrismaService) {}

  async pingsForVisit(visitId: string, limit: number): Promise<VisitLocationPingView[]> {
    const rows = await this.prisma.locationPing.findMany({
      where: { visitId },
      orderBy: { recordedAt: 'desc' },
      take: limit,
      select: { latitude: true, longitude: true, mode: true, recordedAt: true },
    });
    return rows.map((row) => ({
      latitude: row.latitude,
      longitude: row.longitude,
      mode: String(row.mode),
      recordedAt: row.recordedAt,
    }));
  }
}
