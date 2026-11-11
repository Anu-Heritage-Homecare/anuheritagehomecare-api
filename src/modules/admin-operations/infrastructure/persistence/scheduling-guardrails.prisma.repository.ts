import { Injectable } from '@nestjs/common';
import {
  AutoAssignAlgorithm as PrismaAlgorithm,
  SchedulingGuardrails as PrismaGuardrails,
} from '@prisma/client';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { AutoAssignAlgorithm } from '../../domain/auto-assign-algorithm.enum';
import { SchedulingGuardrails } from '../../domain/scheduling-guardrails.entity';
import {
  SCHEDULING_GUARDRAILS_ID,
  SchedulingGuardrailsRepository,
} from '../../domain/scheduling-guardrails.repository';

const TO_DOMAIN_ALGORITHM: Record<PrismaAlgorithm, AutoAssignAlgorithm> = {
  PROXIMITY_AND_SKILLS: AutoAssignAlgorithm.ProximityAndSkills,
  PROXIMITY_ONLY: AutoAssignAlgorithm.ProximityOnly,
  SKILLS_ONLY: AutoAssignAlgorithm.SkillsOnly,
  ROUND_ROBIN: AutoAssignAlgorithm.RoundRobin,
  MANUAL: AutoAssignAlgorithm.Manual,
};
const TO_PRISMA_ALGORITHM: Record<AutoAssignAlgorithm, PrismaAlgorithm> = {
  [AutoAssignAlgorithm.ProximityAndSkills]: 'PROXIMITY_AND_SKILLS',
  [AutoAssignAlgorithm.ProximityOnly]: 'PROXIMITY_ONLY',
  [AutoAssignAlgorithm.SkillsOnly]: 'SKILLS_ONLY',
  [AutoAssignAlgorithm.RoundRobin]: 'ROUND_ROBIN',
  [AutoAssignAlgorithm.Manual]: 'MANUAL',
};

/** Prisma backed adapter for the singleton SchedulingGuardrailsRepository port. */
@Injectable()
export class SchedulingGuardrailsPrismaRepository implements SchedulingGuardrailsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async get(): Promise<SchedulingGuardrails | null> {
    const row = await this.prisma.schedulingGuardrails.findUnique({
      where: { id: SCHEDULING_GUARDRAILS_ID },
    });
    return row ? SchedulingGuardrailsPrismaRepository.toDomain(row) : null;
  }

  async save(guardrails: SchedulingGuardrails): Promise<void> {
    const data = {
      minimumNoticeHours: guardrails.minimumNoticeHours,
      travelBufferMinutes: guardrails.travelBufferMinutes,
      maxVisitsPerCaregiverPerDay: guardrails.maxVisitsPerCaregiverPerDay,
      autoAssignAlgorithm: TO_PRISMA_ALGORITHM[guardrails.autoAssignAlgorithm],
      updatedAt: guardrails.updatedAt,
    };
    await this.prisma.schedulingGuardrails.upsert({
      where: { id: SCHEDULING_GUARDRAILS_ID },
      create: { id: SCHEDULING_GUARDRAILS_ID, createdAt: guardrails.createdAt, ...data },
      update: data,
    });
  }

  private static toDomain(row: PrismaGuardrails): SchedulingGuardrails {
    return SchedulingGuardrails.rehydrate(row.id, {
      minimumNoticeHours: row.minimumNoticeHours,
      travelBufferMinutes: row.travelBufferMinutes,
      maxVisitsPerCaregiverPerDay: row.maxVisitsPerCaregiverPerDay,
      autoAssignAlgorithm: TO_DOMAIN_ALGORITHM[row.autoAssignAlgorithm],
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
