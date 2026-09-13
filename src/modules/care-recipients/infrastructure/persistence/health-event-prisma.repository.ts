import { Injectable } from '@nestjs/common';
import { HealthEventCategory as PrismaCategory } from '@prisma/client';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { HealthEvent } from '../../domain/health-event.entity';
import { HealthEventCategory } from '../../domain/health-event-category.enum';
import { HealthEventRepository } from '../../domain/health-event.repository';

const TO_PERSISTENCE_CATEGORY: Record<HealthEventCategory, PrismaCategory> = {
  [HealthEventCategory.Vitals]: 'VITALS',
  [HealthEventCategory.Alert]: 'ALERT',
  [HealthEventCategory.Medication]: 'MEDICATION',
  [HealthEventCategory.Incident]: 'INCIDENT',
  [HealthEventCategory.Assessment]: 'ASSESSMENT',
  [HealthEventCategory.Appointment]: 'APPOINTMENT',
  [HealthEventCategory.Specialist]: 'SPECIALIST',
  [HealthEventCategory.Care]: 'CARE',
};

/** Prisma backed adapter for the HealthEventRepository port (append only). */
@Injectable()
export class HealthEventPrismaRepository implements HealthEventRepository {
  constructor(private readonly prisma: PrismaService) {}

  async add(event: HealthEvent): Promise<void> {
    await this.prisma.healthEvent.create({
      data: {
        id: event.id,
        careRecipientId: event.careRecipientId,
        category: TO_PERSISTENCE_CATEGORY[event.category],
        title: event.title,
        description: event.description,
        recordedByName: event.recordedByName,
        recordedByRole: event.recordedByRole,
        occurredAt: event.occurredAt,
        authorAdminId: event.authorAdminId,
        createdAt: event.createdAt,
      },
    });
  }
}
