import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { EmergencyProtocolStep } from '../../domain/emergency-protocol-step.enum';
import { EmergencyResponseRepository } from '../../domain/emergency-response.repository';
import { SosProtocolCompletion } from '../../domain/sos-protocol-completion.entity';
import { SosResponseEvent } from '../../domain/sos-response-event.entity';
import { EmergencyResponseMapper } from './emergency-response.mapper';

/** Prisma adapter for the EmergencyResponseRepository port (two owned tables). */
@Injectable()
export class EmergencyResponsePrismaRepository implements EmergencyResponseRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listCompletions(sosAlertId: string): Promise<SosProtocolCompletion[]> {
    const rows = await this.prisma.sosProtocolCompletion.findMany({ where: { sosAlertId } });
    return rows.map((row) => EmergencyResponseMapper.completionToDomain(row));
  }

  async saveCompletion(completion: SosProtocolCompletion): Promise<void> {
    const step = EmergencyResponseMapper.stepToPersistence(completion.step);
    await this.prisma.sosProtocolCompletion.upsert({
      where: { sosAlertId_step: { sosAlertId: completion.sosAlertId, step } },
      create: {
        id: completion.id,
        sosAlertId: completion.sosAlertId,
        step,
        completedAt: completion.completedAt,
        completedByAdminId: completion.completedByAdminId,
      },
      update: {
        completedAt: completion.completedAt,
        completedByAdminId: completion.completedByAdminId,
      },
    });
  }

  async removeCompletion(sosAlertId: string, step: EmergencyProtocolStep): Promise<void> {
    await this.prisma.sosProtocolCompletion.deleteMany({
      where: { sosAlertId, step: EmergencyResponseMapper.stepToPersistence(step) },
    });
  }

  async listEvents(sosAlertId: string): Promise<SosResponseEvent[]> {
    const rows = await this.prisma.sosResponseEvent.findMany({
      where: { sosAlertId },
      orderBy: { at: 'asc' },
    });
    return rows.map((row) => EmergencyResponseMapper.eventToDomain(row));
  }

  async appendEvent(event: SosResponseEvent): Promise<void> {
    await this.prisma.sosResponseEvent.create({
      data: {
        id: event.id,
        sosAlertId: event.sosAlertId,
        at: event.at,
        kind: EmergencyResponseMapper.kindToPersistence(event.kind),
        description: event.description,
        actorAdminId: event.actorAdminId,
        linkedIncidentId: event.linkedIncidentId,
      },
    });
  }
}
