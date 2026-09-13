import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import {
  RecipientVitalsDirectory,
  VitalsReadingView,
} from '../../application/ports/recipient-vitals.port';

/**
 * Reads the visits context's recorded vital signs for one recipient's Health
 * screen, scoped through each reading's visit. Ordered most recent first; the use
 * case reverses for the chronological sparklines.
 */
@Injectable()
export class VisitsRecipientVitalsDirectory implements RecipientVitalsDirectory {
  constructor(private readonly prisma: PrismaService) {}

  async recentReadings(recipientId: string, limit: number): Promise<VitalsReadingView[]> {
    const rows = await this.prisma.visitVitals.findMany({
      where: { visit: { careRecipientId: recipientId } },
      orderBy: { recordedAt: 'desc' },
      take: limit,
      select: {
        systolic: true,
        diastolic: true,
        heartRate: true,
        oxygenSaturation: true,
        weightGrams: true,
        temperatureTenths: true,
        bloodGlucose: true,
        recordedAt: true,
      },
    });
    return rows;
  }
}
