import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { ClientApplication, StageEntry } from '../../domain/client-application.entity';
import { ClientApplicationRepository } from '../../domain/client-application.repository';
import {
  TO_DOMAIN_CURRENCY,
  TO_DOMAIN_PAYMENT_STATUS,
  TO_DOMAIN_PLAN_TYPE,
  TO_DOMAIN_STAGE,
  TO_DOMAIN_STATUS,
  TO_PERSISTENCE_CURRENCY,
  TO_PERSISTENCE_PAYMENT_STATUS,
  TO_PERSISTENCE_PLAN_TYPE,
  TO_PERSISTENCE_STAGE,
  TO_PERSISTENCE_STATUS,
} from './onboarding-enum.maps';

/** Prisma backed adapter for the ClientApplicationRepository port. */
@Injectable()
export class ClientApplicationPrismaRepository implements ClientApplicationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(application: ClientApplication): Promise<void> {
    const data = this.toData(application);
    const entries = application.pullPendingStageEntries();
    await this.prisma.$transaction(async (tx) => {
      await tx.clientApplication.upsert({
        where: { id: application.id },
        create: data,
        update: {
          ownerId: data.ownerId,
          careRecipientId: data.careRecipientId,
          familyName: data.familyName,
          patientName: data.patientName,
          selectedPlanType: data.selectedPlanType,
          currency: data.currency,
          monthlyPriceMinor: data.monthlyPriceMinor,
          paymentStatus: data.paymentStatus,
          coordinatorId: data.coordinatorId,
          caregiverId: data.caregiverId,
          stage: data.stage,
          status: data.status,
          activatedSubscriptionId: data.activatedSubscriptionId,
          updatedAt: data.updatedAt,
        },
      });
      if (entries.length > 0) {
        await tx.clientLifecycleEvent.createMany({
          data: entries.map((entry) => ({
            applicationId: application.id,
            stage: TO_PERSISTENCE_STAGE[entry.stage],
            enteredAt: entry.enteredAt,
          })),
        });
      }
    });
  }

  async findById(id: string): Promise<ClientApplication | null> {
    const row = await this.prisma.clientApplication.findUnique({
      where: { id },
      include: { events: { orderBy: { enteredAt: 'asc' } } },
    });
    if (row === null) {
      return null;
    }
    const history: StageEntry[] = row.events.map((event) => ({
      stage: TO_DOMAIN_STAGE[event.stage],
      enteredAt: event.enteredAt,
    }));
    return ClientApplication.rehydrate(
      row.id,
      {
        ownerId: row.ownerId,
        careRecipientId: row.careRecipientId,
        familyName: row.familyName,
        patientName: row.patientName,
        selectedPlanType:
          row.selectedPlanType === null ? null : TO_DOMAIN_PLAN_TYPE[row.selectedPlanType],
        currency: TO_DOMAIN_CURRENCY[row.currency],
        monthlyPriceMinor: row.monthlyPriceMinor,
        paymentStatus: TO_DOMAIN_PAYMENT_STATUS[row.paymentStatus],
        coordinatorId: row.coordinatorId,
        caregiverId: row.caregiverId,
        stage: TO_DOMAIN_STAGE[row.stage],
        status: TO_DOMAIN_STATUS[row.status],
        submittedAt: row.submittedAt,
        activatedSubscriptionId: row.activatedSubscriptionId,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      },
      history,
    );
  }

  private toData(application: ClientApplication): Prisma.ClientApplicationUncheckedCreateInput {
    return {
      id: application.id,
      ownerId: application.ownerId,
      careRecipientId: application.careRecipientId,
      familyName: application.familyName,
      patientName: application.patientName,
      selectedPlanType:
        application.selectedPlanType === null
          ? null
          : TO_PERSISTENCE_PLAN_TYPE[application.selectedPlanType],
      currency: TO_PERSISTENCE_CURRENCY[application.currency],
      monthlyPriceMinor: application.monthlyPriceMinor,
      paymentStatus: TO_PERSISTENCE_PAYMENT_STATUS[application.paymentStatus],
      coordinatorId: application.coordinatorId,
      caregiverId: application.caregiverId,
      stage: TO_PERSISTENCE_STAGE[application.stage],
      status: TO_PERSISTENCE_STATUS[application.status],
      submittedAt: application.submittedAt,
      activatedSubscriptionId: application.activatedSubscriptionId,
      createdAt: application.createdAt,
      updatedAt: application.updatedAt,
    };
  }
}
