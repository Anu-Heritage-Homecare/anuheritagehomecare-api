import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { DischargeRecord } from '../../domain/discharge-record.entity';
import { DischargeRecordRepository } from '../../domain/discharge-record.repository';
import {
  TO_DOMAIN_ACKNOWLEDGEMENT,
  TO_DOMAIN_ACTION,
  TO_DOMAIN_REASON,
  TO_DOMAIN_STATUS,
  TO_PERSISTENCE_ACKNOWLEDGEMENT,
  TO_PERSISTENCE_ACTION,
  TO_PERSISTENCE_REASON,
  TO_PERSISTENCE_STATUS,
} from './discharge-enum.maps';

/** Prisma backed adapter for the DischargeRecordRepository port. */
@Injectable()
export class DischargeRecordPrismaRepository implements DischargeRecordRepository {
  constructor(private readonly prisma: PrismaService) {}

  async add(record: DischargeRecord): Promise<void> {
    await this.prisma.dischargeRecord.create({ data: this.toData(record) });
  }

  async save(record: DischargeRecord): Promise<void> {
    const { id, careRecipientId, createdAt, ...data } = this.toData(record);
    void id;
    void careRecipientId;
    void createdAt;
    await this.prisma.dischargeRecord.update({ where: { id: record.id }, data });
  }

  async findByRecipient(careRecipientId: string): Promise<DischargeRecord | null> {
    const row = await this.prisma.dischargeRecord.findUnique({ where: { careRecipientId } });
    if (row === null) {
      return null;
    }
    return DischargeRecord.rehydrate(row.id, {
      careRecipientId: row.careRecipientId,
      action: TO_DOMAIN_ACTION[row.action],
      reason: row.reason === null ? null : TO_DOMAIN_REASON[row.reason],
      effectiveDate: row.effectiveDate,
      clinicalSummary: row.clinicalSummary,
      acknowledgements: row.acknowledgements.map((ack) => TO_DOMAIN_ACKNOWLEDGEMENT[ack]),
      status: TO_DOMAIN_STATUS[row.status],
      processedByAdminId: row.processedByAdminId,
      processedAt: row.processedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  private toData(record: DischargeRecord): Prisma.DischargeRecordUncheckedCreateInput {
    return {
      id: record.id,
      careRecipientId: record.careRecipientId,
      action: TO_PERSISTENCE_ACTION[record.action],
      reason: record.reason === null ? null : TO_PERSISTENCE_REASON[record.reason],
      effectiveDate: record.effectiveDate,
      clinicalSummary: record.clinicalSummary,
      acknowledgements: record.acknowledgements.map((ack) => TO_PERSISTENCE_ACKNOWLEDGEMENT[ack]),
      status: TO_PERSISTENCE_STATUS[record.status],
      processedByAdminId: record.processedByAdminId,
      processedAt: record.processedAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}
