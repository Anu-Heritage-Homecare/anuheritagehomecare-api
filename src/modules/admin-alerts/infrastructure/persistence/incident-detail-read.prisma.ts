import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import {
  IncidentDetailReadModel,
  IncidentDetailView,
} from '../../application/ports/incident-detail-read.port';

/**
 * Resolves the recipient, owner contact, caregiver, related visit and coordinator
 * for an incident detail, by querying each owning context's tables directly (the
 * established cross context read model pattern).
 */
@Injectable()
export class IncidentDetailReadPrisma implements IncidentDetailReadModel {
  constructor(private readonly prisma: PrismaService) {}

  async enrich(params: {
    recipientId: string | null;
    caregiverId: string | null;
    visitId: string | null;
    coordinatorAdminId: string | null;
  }): Promise<IncidentDetailView> {
    const [recipientRow, caregiverUser, caregiverProfile, visitRow, coordinator] =
      await Promise.all([
        params.recipientId === null
          ? Promise.resolve(null)
          : this.prisma.careRecipient.findUnique({
              where: { id: params.recipientId },
              select: {
                name: true,
                dateOfBirth: true,
                medicalConditions: true,
                allergies: true,
                relationship: true,
                ownerId: true,
              },
            }),
        params.caregiverId === null
          ? Promise.resolve(null)
          : this.prisma.user.findUnique({
              where: { id: params.caregiverId },
              select: { firstName: true, lastName: true, phone: true },
            }),
        params.caregiverId === null
          ? Promise.resolve(null)
          : this.prisma.caregiverProfile.findUnique({
              where: { userId: params.caregiverId },
              select: { title: true, supervisorName: true },
            }),
        params.visitId === null
          ? Promise.resolve(null)
          : this.prisma.visit.findUnique({
              where: { id: params.visitId },
              select: {
                sequence: true,
                scheduledDate: true,
                startMinute: true,
                endMinute: true,
                visitType: true,
                status: true,
              },
            }),
        params.coordinatorAdminId === null
          ? Promise.resolve(null)
          : this.prisma.adminUser.findUnique({
              where: { id: params.coordinatorAdminId },
              select: { firstName: true, lastName: true },
            }),
      ]);

    const owner =
      recipientRow === null
        ? null
        : await this.prisma.user.findUnique({
            where: { id: recipientRow.ownerId },
            select: { firstName: true, lastName: true, phone: true },
          });

    return {
      recipient:
        recipientRow === null
          ? null
          : {
              name: recipientRow.name,
              dateOfBirth: recipientRow.dateOfBirth,
              medicalConditions: recipientRow.medicalConditions,
              allergies: recipientRow.allergies,
              relationship: recipientRow.relationship,
              ownerName: owner ? `${owner.firstName} ${owner.lastName}` : null,
              ownerPhone: owner?.phone ?? null,
            },
      caregiver:
        caregiverUser === null
          ? null
          : {
              name: `${caregiverUser.firstName} ${caregiverUser.lastName}`,
              designation: caregiverProfile?.title ?? null,
              phone: caregiverUser.phone,
              supervisorName: caregiverProfile?.supervisorName ?? null,
            },
      visit:
        visitRow === null
          ? null
          : {
              sequence: visitRow.sequence,
              scheduledDate: visitRow.scheduledDate,
              startMinute: visitRow.startMinute,
              endMinute: visitRow.endMinute,
              visitType: String(visitRow.visitType),
              status: String(visitRow.status),
            },
      coordinatorName: coordinator ? `${coordinator.firstName} ${coordinator.lastName}` : null,
    };
  }
}
