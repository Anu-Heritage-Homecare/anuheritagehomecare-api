import { Injectable } from '@nestjs/common';
import {
  CareInstructionCategory as PrismaCategory,
  CareInstructionSeverity as PrismaSeverity,
} from '@prisma/client';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { CareInstruction } from '../../domain/care-instruction.entity';
import {
  CareInstructionCategory,
  CareInstructionSeverity,
} from '../../domain/care-instruction.enums';
import { CareInstructionRepository } from '../../domain/care-instruction.repository';

const TO_DOMAIN_CATEGORY: Record<PrismaCategory, CareInstructionCategory> = {
  MEDICAL: CareInstructionCategory.Medical,
  BEHAVIORAL: CareInstructionCategory.Behavioral,
};
const TO_PERSISTENCE_CATEGORY: Record<CareInstructionCategory, PrismaCategory> = {
  [CareInstructionCategory.Medical]: 'MEDICAL',
  [CareInstructionCategory.Behavioral]: 'BEHAVIORAL',
};
const TO_DOMAIN_SEVERITY: Record<PrismaSeverity, CareInstructionSeverity> = {
  CRITICAL: CareInstructionSeverity.Critical,
  WARNING: CareInstructionSeverity.Warning,
  NORMAL: CareInstructionSeverity.Normal,
};
const TO_PERSISTENCE_SEVERITY: Record<CareInstructionSeverity, PrismaSeverity> = {
  [CareInstructionSeverity.Critical]: 'CRITICAL',
  [CareInstructionSeverity.Warning]: 'WARNING',
  [CareInstructionSeverity.Normal]: 'NORMAL',
};

/** Prisma backed adapter for the CareInstructionRepository port. */
@Injectable()
export class CareInstructionPrismaRepository implements CareInstructionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async replaceForRecipient(
    careRecipientId: string,
    instructions: CareInstruction[],
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.careInstruction.deleteMany({ where: { careRecipientId } }),
      this.prisma.careInstruction.createMany({
        data: instructions.map((instruction) => ({
          id: instruction.id,
          careRecipientId: instruction.careRecipientId,
          category: TO_PERSISTENCE_CATEGORY[instruction.category],
          text: instruction.text,
          severity: TO_PERSISTENCE_SEVERITY[instruction.severity],
          position: instruction.position,
        })),
      }),
    ]);
  }

  async listForRecipient(careRecipientId: string): Promise<CareInstruction[]> {
    const rows = await this.prisma.careInstruction.findMany({
      where: { careRecipientId },
      orderBy: { position: 'asc' },
    });
    return rows.map((row) =>
      CareInstruction.rehydrate(row.id, {
        careRecipientId: row.careRecipientId,
        category: TO_DOMAIN_CATEGORY[row.category],
        text: row.text,
        severity: TO_DOMAIN_SEVERITY[row.severity],
        position: row.position,
      }),
    );
  }
}
