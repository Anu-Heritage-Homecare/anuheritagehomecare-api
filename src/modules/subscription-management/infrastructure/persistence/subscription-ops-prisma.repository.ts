import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { SubscriptionOps } from '../../domain/subscription-ops.entity';
import { SubscriptionOpsRepository } from '../../domain/subscription-ops.repository';
import { TO_DOMAIN_EVENT_TYPE, TO_PERSISTENCE_EVENT_TYPE } from './subscription-ops-enum.maps';

/** Prisma backed adapter for the SubscriptionOpsRepository port. */
@Injectable()
export class SubscriptionOpsPrismaRepository implements SubscriptionOpsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(ops: SubscriptionOps): Promise<void> {
    const data = this.toData(ops);
    const events = ops.pullPendingEvents();
    const notes = ops.pullPendingNotes();
    await this.prisma.$transaction(async (tx) => {
      await tx.subscriptionOps.upsert({
        where: { id: ops.id },
        create: data,
        update: {
          coordinatorId: data.coordinatorId,
          caregiverId: data.caregiverId,
          contractStartAt: data.contractStartAt,
          activatedAt: data.activatedAt,
          flexAllocatedTenths: data.flexAllocatedTenths,
          flexConsumedTenths: data.flexConsumedTenths,
          flexCycleEndsAt: data.flexCycleEndsAt,
          updatedAt: data.updatedAt,
        },
      });
      if (events.length > 0) {
        await tx.subscriptionOpsEvent.createMany({
          data: events.map((event) => ({
            opsId: ops.id,
            type: TO_PERSISTENCE_EVENT_TYPE[event.type],
            detail: event.detail,
            hoursDeltaTenths: event.hoursDeltaTenths,
            actorAdminId: event.actorAdminId,
            actorLabel: event.actorLabel,
            occurredAt: event.occurredAt,
          })),
        });
      }
      if (notes.length > 0) {
        await tx.subscriptionOpsNote.createMany({
          data: notes.map((note) => ({
            opsId: ops.id,
            body: note.body,
            authorAdminId: note.authorAdminId,
            authorName: note.authorName,
            createdAt: note.createdAt,
          })),
        });
      }
    });
  }

  async findBySubscriptionId(subscriptionId: string): Promise<SubscriptionOps | null> {
    const row = await this.prisma.subscriptionOps.findUnique({
      where: { subscriptionId },
      include: {
        events: { orderBy: { occurredAt: 'asc' } },
        notes: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (row === null) {
      return null;
    }
    return SubscriptionOps.rehydrate(
      row.id,
      {
        subscriptionId: row.subscriptionId,
        coordinatorId: row.coordinatorId,
        caregiverId: row.caregiverId,
        contractStartAt: row.contractStartAt,
        activatedAt: row.activatedAt,
        flexAllocatedTenths: row.flexAllocatedTenths,
        flexConsumedTenths: row.flexConsumedTenths,
        flexCycleEndsAt: row.flexCycleEndsAt,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      },
      {
        events: row.events.map((event) => ({
          type: TO_DOMAIN_EVENT_TYPE[event.type],
          detail: event.detail,
          hoursDeltaTenths: event.hoursDeltaTenths,
          actorAdminId: event.actorAdminId,
          actorLabel: event.actorLabel,
          occurredAt: event.occurredAt,
        })),
        notes: row.notes.map((note) => ({
          body: note.body,
          authorAdminId: note.authorAdminId,
          authorName: note.authorName,
          createdAt: note.createdAt,
        })),
      },
    );
  }

  private toData(ops: SubscriptionOps): Prisma.SubscriptionOpsUncheckedCreateInput {
    return {
      id: ops.id,
      subscriptionId: ops.subscriptionId,
      coordinatorId: ops.coordinatorId,
      caregiverId: ops.caregiverId,
      contractStartAt: ops.contractStartAt,
      activatedAt: ops.activatedAt,
      flexAllocatedTenths: ops.flexAllocatedTenths,
      flexConsumedTenths: ops.flexConsumedTenths,
      flexCycleEndsAt: ops.flexCycleEndsAt,
      createdAt: ops.createdAt,
      updatedAt: ops.updatedAt,
    };
  }
}
