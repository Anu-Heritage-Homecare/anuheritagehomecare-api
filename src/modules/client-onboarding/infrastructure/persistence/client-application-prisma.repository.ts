import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { ClientApplication, StageEntry } from '../../domain/client-application.entity';
import { ClientApplicationRepository } from '../../domain/client-application.repository';
import {
  TO_DOMAIN_CURRENCY,
  TO_DOMAIN_DOCS_STATUS,
  TO_DOMAIN_PAYMENT_STATUS,
  TO_DOMAIN_PLAN_TYPE,
  TO_DOMAIN_PRIORITY,
  TO_DOMAIN_STAGE,
  TO_DOMAIN_STATUS,
  TO_PERSISTENCE_CURRENCY,
  TO_PERSISTENCE_DOCS_STATUS,
  TO_PERSISTENCE_PAYMENT_STATUS,
  TO_PERSISTENCE_PLAN_TYPE,
  TO_PERSISTENCE_PRIORITY,
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
    const documents = application.pullPendingDocuments();
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
          priority: data.priority,
          paymentStatus: data.paymentStatus,
          docsStatus: data.docsStatus,
          coordinatorId: data.coordinatorId,
          caregiverId: data.caregiverId,
          stage: data.stage,
          status: data.status,
          activatedSubscriptionId: data.activatedSubscriptionId,
          patientDateOfBirth: data.patientDateOfBirth,
          patientGender: data.patientGender,
          patientConditions: data.patientConditions,
          contactName: data.contactName,
          contactPhone: data.contactPhone,
          contactEmail: data.contactEmail,
          contactAddress: data.contactAddress,
          requestedHoursPerWeek: data.requestedHoursPerWeek,
          requestedSchedule: data.requestedSchedule,
          specialNeeds: data.specialNeeds,
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
      if (documents.length > 0) {
        await tx.clientApplicationDocument.createMany({
          data: documents.map((document) => ({
            applicationId: application.id,
            label: document.label,
            key: document.key,
          })),
        });
      }
    });
  }

  async findById(id: string): Promise<ClientApplication | null> {
    const row = await this.prisma.clientApplication.findUnique({
      where: { id },
      include: {
        events: { orderBy: { enteredAt: 'asc' } },
        documents: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (row === null) {
      return null;
    }
    const history: StageEntry[] = row.events.map((event) => ({
      stage: TO_DOMAIN_STAGE[event.stage],
      enteredAt: event.enteredAt,
    }));
    const documents = row.documents.map((document) => ({
      label: document.label,
      key: document.key,
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
        priority: TO_DOMAIN_PRIORITY[row.priority],
        paymentStatus: TO_DOMAIN_PAYMENT_STATUS[row.paymentStatus],
        docsStatus: TO_DOMAIN_DOCS_STATUS[row.docsStatus],
        coordinatorId: row.coordinatorId,
        caregiverId: row.caregiverId,
        stage: TO_DOMAIN_STAGE[row.stage],
        status: TO_DOMAIN_STATUS[row.status],
        submittedAt: row.submittedAt,
        activatedSubscriptionId: row.activatedSubscriptionId,
        patientDateOfBirth: row.patientDateOfBirth,
        patientGender: row.patientGender,
        patientConditions: row.patientConditions,
        contactName: row.contactName,
        contactPhone: row.contactPhone,
        contactEmail: row.contactEmail,
        contactAddress: row.contactAddress,
        requestedHoursPerWeek: row.requestedHoursPerWeek,
        requestedSchedule: row.requestedSchedule,
        specialNeeds: row.specialNeeds,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      },
      history,
      documents,
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
      priority: TO_PERSISTENCE_PRIORITY[application.priority],
      paymentStatus: TO_PERSISTENCE_PAYMENT_STATUS[application.paymentStatus],
      docsStatus: TO_PERSISTENCE_DOCS_STATUS[application.docsStatus],
      coordinatorId: application.coordinatorId,
      caregiverId: application.caregiverId,
      stage: TO_PERSISTENCE_STAGE[application.stage],
      status: TO_PERSISTENCE_STATUS[application.status],
      submittedAt: application.submittedAt,
      activatedSubscriptionId: application.activatedSubscriptionId,
      patientDateOfBirth: application.patientDateOfBirth,
      patientGender: application.patientGender,
      patientConditions: application.patientConditions,
      contactName: application.contactName,
      contactPhone: application.contactPhone,
      contactEmail: application.contactEmail,
      contactAddress: application.contactAddress,
      requestedHoursPerWeek: application.requestedHoursPerWeek,
      requestedSchedule: application.requestedSchedule,
      specialNeeds: application.specialNeeds,
      createdAt: application.createdAt,
      updatedAt: application.updatedAt,
    };
  }
}
