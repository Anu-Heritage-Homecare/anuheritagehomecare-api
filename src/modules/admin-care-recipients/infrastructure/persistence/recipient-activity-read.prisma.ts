import { Injectable } from '@nestjs/common';
import { MedicationAdministrationOutcome, NoteCategory } from '@prisma/client';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import {
  ActivityCategory,
  ActivityEventView,
  RecipientActivityReadModel,
} from '../../application/ports/recipient-activity-read.port';

/** A cap per source, so a wide window can never trigger an unbounded read. */
const PER_SOURCE_LIMIT = 500;

const OUTCOME_LABEL: Record<MedicationAdministrationOutcome, string> = {
  ADMINISTERED: 'given',
  REFUSED: 'refused',
  OUT_OF_STOCK: 'out of stock',
  PATIENT_ASLEEP: 'patient asleep',
};

const NOTE_CATEGORY_ACTIVITY: Record<NoteCategory, ActivityCategory> = {
  VISIT_NOTE: 'VISITS',
  CLINICAL: 'MEDICAL',
  INCIDENT: 'MEDICAL',
  COORDINATOR: 'ADMINISTRATIVE',
  FAMILY_COMMUNICATION: 'ADMINISTRATIVE',
};

/**
 * Prisma read model that assembles the recipient audit trail. Each source is queried
 * within the window (and capped), performer names are resolved in batch (no N plus 1),
 * and the merged events are returned newest first.
 */
@Injectable()
export class RecipientActivityReadPrisma implements RecipientActivityReadModel {
  constructor(private readonly prisma: PrismaService) {}

  async listSince(recipientId: string, since: Date): Promise<ActivityEventView[]> {
    const scoped = { careRecipientId: recipientId };
    const viaVisit = { visit: { careRecipientId: recipientId } };

    const [visits, visitNotes, administrations, vitals, careNotes, revisions, invoices] =
      await Promise.all([
        this.prisma.visit.findMany({
          where: {
            careRecipientId: recipientId,
            OR: [{ clockInAt: { gte: since } }, { clockOutAt: { gte: since } }],
          },
          orderBy: { scheduledDate: 'desc' },
          take: PER_SOURCE_LIMIT,
          select: {
            id: true,
            caregiverId: true,
            visitType: true,
            clockInAt: true,
            clockOutAt: true,
          },
        }),
        this.prisma.visitNote.findMany({
          where: { createdAt: { gte: since }, ...viaVisit },
          orderBy: { createdAt: 'desc' },
          take: PER_SOURCE_LIMIT,
          select: { id: true, authorId: true, text: true, createdAt: true },
        }),
        this.prisma.medicationAdministration.findMany({
          where: { recordedAt: { gte: since }, ...viaVisit },
          orderBy: { recordedAt: 'desc' },
          take: PER_SOURCE_LIMIT,
          select: {
            id: true,
            medicationId: true,
            outcome: true,
            note: true,
            recordedAt: true,
            visit: { select: { caregiverId: true } },
          },
        }),
        this.prisma.visitVitals.findMany({
          where: { recordedAt: { gte: since }, ...viaVisit },
          orderBy: { recordedAt: 'desc' },
          take: PER_SOURCE_LIMIT,
          select: {
            id: true,
            systolic: true,
            diastolic: true,
            heartRate: true,
            oxygenSaturation: true,
            temperatureTenths: true,
            bloodGlucose: true,
            recordedAt: true,
            visit: { select: { caregiverId: true } },
          },
        }),
        this.prisma.careNote.findMany({
          where: { ...scoped, postedAt: { gte: since } },
          orderBy: { postedAt: 'desc' },
          take: PER_SOURCE_LIMIT,
          select: {
            id: true,
            category: true,
            content: true,
            authorName: true,
            authorRole: true,
            postedAt: true,
          },
        }),
        this.prisma.carePlanRevision.findMany({
          where: { ...scoped, createdAt: { gte: since } },
          orderBy: { createdAt: 'desc' },
          take: PER_SOURCE_LIMIT,
          select: { id: true, description: true, authorAdminId: true, createdAt: true },
        }),
        this.prisma.recipientInvoice.findMany({
          where: { ...scoped, issuedAt: { gte: since } },
          orderBy: { issuedAt: 'desc' },
          take: PER_SOURCE_LIMIT,
          select: { id: true, sequence: true, servicesLabel: true, issuedAt: true },
        }),
      ]);

    const [caregiverNames, adminNames, medicationNames] = await Promise.all([
      this.namesFor('user', [
        ...visits.map((v) => v.caregiverId),
        ...visitNotes.map((n) => n.authorId),
        ...administrations.map((a) => a.visit.caregiverId),
        ...vitals.map((v) => v.visit.caregiverId),
      ]),
      this.namesFor(
        'admin',
        revisions.map((r) => r.authorAdminId),
      ),
      this.medicationNames(administrations.map((a) => a.medicationId)),
    ]);

    const events: ActivityEventView[] = [];

    for (const visit of visits) {
      const caregiver = visit.caregiverId === null ? null : caregiverNames.get(visit.caregiverId);
      if (visit.clockInAt !== null && visit.clockInAt.getTime() >= since.getTime()) {
        events.push({
          id: `visit-in:${visit.id}`,
          occurredAt: visit.clockInAt,
          category: 'VISITS',
          type: 'VISIT_STARTED',
          title: 'Visit Started',
          description: `Clocked in for ${friendly(visit.visitType)} visit. Verified location check.`,
          performedByName: caregiver ?? null,
          performedByRole: caregiver === undefined || caregiver === null ? null : 'Caregiver',
        });
      }
      if (visit.clockOutAt !== null && visit.clockOutAt.getTime() >= since.getTime()) {
        const duration =
          visit.clockInAt === null ? null : hoursBetween(visit.clockInAt, visit.clockOutAt);
        events.push({
          id: `visit-out:${visit.id}`,
          occurredAt: visit.clockOutAt,
          category: 'VISITS',
          type: 'VISIT_COMPLETED',
          title: 'Visit Completed',
          description: duration === null ? 'Clocked out.' : `Clocked out. Duration: ${duration}h.`,
          performedByName: caregiver ?? null,
          performedByRole: caregiver === undefined || caregiver === null ? null : 'Caregiver',
        });
      }
    }

    for (const note of visitNotes) {
      const author = caregiverNames.get(note.authorId) ?? null;
      events.push({
        id: `visit-note:${note.id}`,
        occurredAt: note.createdAt,
        category: 'VISITS',
        type: 'VISIT_NOTE_ADDED',
        title: 'Visit Note Added',
        description: note.text,
        performedByName: author,
        performedByRole: author === null ? null : 'Caregiver',
      });
    }

    for (const admin of administrations) {
      const caregiver =
        admin.visit.caregiverId === null ? null : caregiverNames.get(admin.visit.caregiverId);
      const medication = medicationNames.get(admin.medicationId) ?? 'Medication';
      const base = `${medication} marked as ${OUTCOME_LABEL[admin.outcome]}.`;
      events.push({
        id: `med:${admin.id}`,
        occurredAt: admin.recordedAt,
        category: 'MEDICAL',
        type: 'MEDICATION_ADMINISTERED',
        title: 'Medication Administered',
        description: admin.note === null ? base : `${base} ${admin.note}`,
        performedByName: caregiver ?? null,
        performedByRole: caregiver === undefined || caregiver === null ? null : 'Caregiver',
      });
    }

    for (const reading of vitals) {
      const caregiver =
        reading.visit.caregiverId === null ? null : caregiverNames.get(reading.visit.caregiverId);
      events.push({
        id: `vitals:${reading.id}`,
        occurredAt: reading.recordedAt,
        category: 'MEDICAL',
        type: 'VITALS_RECORDED',
        title: 'Vitals Recorded',
        description: describeVitals(reading),
        performedByName: caregiver ?? null,
        performedByRole: caregiver === undefined || caregiver === null ? null : 'Caregiver',
      });
    }

    for (const note of careNotes) {
      events.push({
        id: `care-note:${note.id}`,
        occurredAt: note.postedAt,
        category: NOTE_CATEGORY_ACTIVITY[note.category],
        type: 'CARE_NOTE_ADDED',
        title: 'Care Note Added',
        description: note.content,
        performedByName: note.authorName,
        performedByRole: note.authorRole,
      });
    }

    for (const revision of revisions) {
      const admin = revision.authorAdminId === null ? null : adminNames.get(revision.authorAdminId);
      events.push({
        id: `care-plan:${revision.id}`,
        occurredAt: revision.createdAt,
        category: 'ADMINISTRATIVE',
        type: 'CARE_PLAN_UPDATED',
        title: 'Care Plan Updated',
        description: revision.description,
        performedByName: admin ?? null,
        performedByRole: admin === undefined || admin === null ? null : 'Coordinator',
      });
    }

    for (const invoice of invoices) {
      events.push({
        id: `invoice:${invoice.id}`,
        occurredAt: invoice.issuedAt,
        category: 'ADMINISTRATIVE',
        type: 'INVOICE_ISSUED',
        title: 'Invoice Issued',
        description: `Invoice ${String(invoice.sequence).padStart(3, '0')} issued: ${invoice.servicesLabel}`,
        performedByName: null,
        performedByRole: null,
      });
    }

    return events.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
  }

  private async namesFor(
    kind: 'user' | 'admin',
    ids: (string | null)[],
  ): Promise<Map<string, string>> {
    const unique = [...new Set(ids.filter((id): id is string => id !== null))];
    if (unique.length === 0) {
      return new Map();
    }
    const rows =
      kind === 'user'
        ? await this.prisma.user.findMany({
            where: { id: { in: unique } },
            select: { id: true, firstName: true, lastName: true },
          })
        : await this.prisma.adminUser.findMany({
            where: { id: { in: unique } },
            select: { id: true, firstName: true, lastName: true },
          });
    return new Map(rows.map((row) => [row.id, `${row.firstName} ${row.lastName}`.trim()]));
  }

  private async medicationNames(ids: string[]): Promise<Map<string, string>> {
    const unique = [...new Set(ids)];
    if (unique.length === 0) {
      return new Map();
    }
    const rows = await this.prisma.medication.findMany({
      where: { id: { in: unique } },
      select: { id: true, name: true, dose: true },
    });
    return new Map(
      rows.map((row) => [row.id, row.dose === null ? row.name : `${row.name} ${row.dose}`]),
    );
  }
}

/** Whole hours between two instants, at least 1 when any time elapsed. */
function hoursBetween(start: Date, end: Date): number {
  const hours = Math.round((end.getTime() - start.getTime()) / 3_600_000);
  return Math.max(1, hours);
}

/** Turn an UPPER_SNAKE enum value into a lower case, spaced phrase. */
function friendly(value: string): string {
  return value.toLowerCase().replace(/_/g, ' ');
}

function describeVitals(reading: {
  systolic: number | null;
  diastolic: number | null;
  heartRate: number | null;
  oxygenSaturation: number | null;
  temperatureTenths: number | null;
  bloodGlucose: number | null;
}): string {
  const parts: string[] = [];
  if (reading.systolic !== null && reading.diastolic !== null) {
    parts.push(`BP ${reading.systolic}/${reading.diastolic}`);
  }
  if (reading.heartRate !== null) {
    parts.push(`HR ${reading.heartRate}`);
  }
  if (reading.temperatureTenths !== null) {
    parts.push(`Temp ${(reading.temperatureTenths / 10).toFixed(1)} C`);
  }
  if (reading.oxygenSaturation !== null) {
    parts.push(`O2 ${reading.oxygenSaturation}%`);
  }
  if (reading.bloodGlucose !== null) {
    parts.push(`Glucose ${reading.bloodGlucose} mg/dL`);
  }
  return parts.length === 0 ? 'Vital signs recorded.' : `${parts.join(', ')}.`;
}
