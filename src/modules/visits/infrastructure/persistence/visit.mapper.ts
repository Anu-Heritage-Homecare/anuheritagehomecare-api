import {
  MedicationAdministration as PrismaMedicationAdministration,
  MedicationAdministrationOutcome as PrismaOutcome,
  NoteAudience as PrismaNoteAudience,
  Visit as PrismaVisit,
  VisitBreak as PrismaVisitBreak,
  VisitNote as PrismaVisitNote,
  VisitNoteReply as PrismaVisitNoteReply,
  VisitNoteSource as PrismaVisitNoteSource,
  VisitPriority as PrismaVisitPriority,
  VisitStatus as PrismaVisitStatus,
  VisitTask as PrismaVisitTask,
  VisitTaskCategory as PrismaVisitTaskCategory,
  VisitType as PrismaVisitType,
  VisitVitals as PrismaVisitVitals,
} from '@prisma/client';
import { Coordinates } from '@shared/domain/coordinates.vo';
import { MedicationAdministrationOutcome } from '../../domain/medication-administration-outcome.enum';
import { NoteAudience } from '../../domain/note-audience.enum';
import { Visit } from '../../domain/visit.entity';
import { VisitPriority } from '../../domain/visit-priority.enum';
import { VisitStatus } from '../../domain/visit-status.enum';
import { VisitType } from '../../domain/visit-type.enum';
import { MedicationAdministration } from '../../domain/value-objects/medication-administration.vo';
import { VisitBreak } from '../../domain/value-objects/visit-break.vo';
import { VisitNote } from '../../domain/value-objects/visit-note.vo';
import { VisitNoteReply } from '../../domain/value-objects/visit-note-reply.vo';
import { VisitNoteSource } from '../../domain/value-objects/visit-note-source.enum';

const TO_DOMAIN_NOTE_SOURCE: Record<PrismaVisitNoteSource, VisitNoteSource> = {
  CAREGIVER: VisitNoteSource.Caregiver,
  COORDINATOR: VisitNoteSource.Coordinator,
  SYSTEM: VisitNoteSource.System,
};

const TO_PERSISTENCE_NOTE_SOURCE: Record<VisitNoteSource, PrismaVisitNoteSource> = {
  [VisitNoteSource.Caregiver]: 'CAREGIVER',
  [VisitNoteSource.Coordinator]: 'COORDINATOR',
  [VisitNoteSource.System]: 'SYSTEM',
};
import { VisitObservation } from '../../domain/value-objects/visit-observation.vo';
import { VisitTask } from '../../domain/value-objects/visit-task.vo';
import { VisitTaskCategory } from '../../domain/value-objects/visit-task-category.enum';
import { VisitWindow } from '../../domain/value-objects/visit-window.vo';
import { VitalsReading } from '../../domain/value-objects/vitals-reading.vo';

const TO_DOMAIN_TASK_CATEGORY: Record<PrismaVisitTaskCategory, VisitTaskCategory> = {
  COMPANIONSHIP: VisitTaskCategory.Companionship,
  PERSONAL_CARE: VisitTaskCategory.PersonalCare,
  CLINICAL_VITALS: VisitTaskCategory.ClinicalVitals,
  MEDICAL_SUPPORT: VisitTaskCategory.MedicalSupport,
  NUTRITION_DIETARY: VisitTaskCategory.NutritionDietary,
  REPORTING_ADMIN: VisitTaskCategory.ReportingAdmin,
  GENERAL: VisitTaskCategory.General,
};

const TO_PERSISTENCE_TASK_CATEGORY: Record<VisitTaskCategory, PrismaVisitTaskCategory> = {
  [VisitTaskCategory.Companionship]: 'COMPANIONSHIP',
  [VisitTaskCategory.PersonalCare]: 'PERSONAL_CARE',
  [VisitTaskCategory.ClinicalVitals]: 'CLINICAL_VITALS',
  [VisitTaskCategory.MedicalSupport]: 'MEDICAL_SUPPORT',
  [VisitTaskCategory.NutritionDietary]: 'NUTRITION_DIETARY',
  [VisitTaskCategory.ReportingAdmin]: 'REPORTING_ADMIN',
  [VisitTaskCategory.General]: 'GENERAL',
};

type VisitRow = PrismaVisit & {
  tasks: PrismaVisitTask[];
  medicationAdministrations: PrismaMedicationAdministration[];
  vitals: PrismaVisitVitals[];
  breaks: PrismaVisitBreak[];
  notes: (PrismaVisitNote & { replies: PrismaVisitNoteReply[] })[];
};

/** Persisted shape of a single task, ready to write under its parent visit. */
export interface VisitTaskRow {
  label: string;
  category: PrismaVisitTaskCategory;
  completed: boolean;
  completedAt: Date | null;
  startedAt: Date | null;
  durationMinutes: number | null;
  scheduledMinute: number | null;
  note: string | null;
  position: number;
}

/** Persisted shape of one medication administration under its parent visit. */
export interface MedicationAdministrationRow {
  medicationId: string;
  outcome: PrismaOutcome;
  note: string | null;
  visitTaskPosition: number | null;
  recordedAt: Date;
}

/** Persisted shape of one vitals reading under its parent visit. */
export interface VisitVitalsRow {
  systolic: number | null;
  diastolic: number | null;
  heartRate: number | null;
  oxygenSaturation: number | null;
  weightGrams: number | null;
  temperatureTenths: number | null;
  bloodGlucose: number | null;
  visitTaskPosition: number | null;
  recordedAt: Date;
}

/** Persisted shape of one break interval under its parent visit. */
export interface VisitBreakRow {
  startedAt: Date;
  endedAt: Date | null;
}

/** Persisted shape of one note under its parent visit. */
export interface VisitNoteRow {
  id: string;
  source: PrismaVisitNoteSource;
  authorId: string | null;
  authorAdminId: string | null;
  authorName: string | null;
  authorRole: string | null;
  audience: PrismaNoteAudience;
  text: string;
  acknowledgedAt: Date | null;
  acknowledgedByName: string | null;
  flaggedForCoordinator: boolean;
  flaggedAt: Date | null;
  editedAt: Date | null;
  createdAt: Date;
}

/** Persisted shape of one reply under its parent visit note. */
export interface VisitNoteReplyRow {
  id: string;
  visitNoteId: string;
  authorName: string;
  authorRole: string;
  text: string;
  createdAt: Date;
}

/**
 * Translates between the Prisma visit row (with its task, medication and vitals
 * rows) and the Visit aggregate. The only place that knows both shapes, so the
 * domain stays free of Prisma types. Tasks keep their stored order; vitals and
 * medication administrations are ordered chronologically.
 */
export class VisitMapper {
  static toDomain(row: VisitRow): Visit {
    const tasks = [...row.tasks]
      .sort((a, b) => a.position - b.position)
      .map((task) =>
        VisitTask.create({
          label: task.label,
          category: TO_DOMAIN_TASK_CATEGORY[task.category],
          completed: task.completed,
          completedAt: task.completedAt,
          startedAt: task.startedAt,
          durationMinutes: task.durationMinutes,
          scheduledMinute: task.scheduledMinute,
          note: task.note,
        }),
      );

    const medicationAdministrations = [...row.medicationAdministrations]
      .sort((a, b) => a.recordedAt.getTime() - b.recordedAt.getTime())
      .map((administration) =>
        MedicationAdministration.create({
          medicationId: administration.medicationId,
          outcome: VisitMapper.TO_DOMAIN_OUTCOME[administration.outcome],
          note: administration.note,
          visitTaskPosition: administration.visitTaskPosition,
          recordedAt: administration.recordedAt,
        }),
      );

    const vitals = [...row.vitals]
      .sort((a, b) => a.recordedAt.getTime() - b.recordedAt.getTime())
      .map((reading) =>
        VitalsReading.create({
          systolic: reading.systolic,
          diastolic: reading.diastolic,
          heartRate: reading.heartRate,
          oxygenSaturation: reading.oxygenSaturation,
          weightGrams: reading.weightGrams,
          temperatureCelsius:
            reading.temperatureTenths === null ? null : reading.temperatureTenths / 10,
          bloodGlucose: reading.bloodGlucose,
          visitTaskPosition: reading.visitTaskPosition,
          recordedAt: reading.recordedAt,
        }),
      );

    const breaks = [...row.breaks]
      .sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime())
      .map((entry) => VisitBreak.rehydrate(entry.startedAt, entry.endedAt));

    const notes = [...row.notes]
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((note) =>
        VisitNote.rehydrate({
          id: note.id,
          source: TO_DOMAIN_NOTE_SOURCE[note.source],
          authorId: note.authorId,
          authorAdminId: note.authorAdminId,
          authorName: note.authorName,
          authorRole: note.authorRole,
          audience: VisitMapper.TO_DOMAIN_AUDIENCE[note.audience],
          text: note.text,
          acknowledgedAt: note.acknowledgedAt,
          acknowledgedByName: note.acknowledgedByName,
          flaggedForCoordinator: note.flaggedForCoordinator,
          flaggedAt: note.flaggedAt,
          editedAt: note.editedAt,
          replies: [...note.replies]
            .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
            .map((reply) =>
              VisitNoteReply.create({
                id: reply.id,
                authorName: reply.authorName,
                authorRole: reply.authorRole,
                text: reply.text,
                createdAt: reply.createdAt,
              }),
            ),
          createdAt: note.createdAt,
        }),
      );

    const arrivalLocation =
      row.arrivalLatitude === null || row.arrivalLongitude === null
        ? null
        : Coordinates.create(row.arrivalLatitude, row.arrivalLongitude);

    return Visit.rehydrate(row.id, {
      sequence: row.sequence,
      caregiverId: row.caregiverId,
      assignedAt: row.assignedAt,
      careRecipientId: row.careRecipientId,
      scheduledDate: row.scheduledDate,
      window: VisitWindow.create(row.startMinute, row.endMinute),
      type: VisitMapper.TO_DOMAIN_TYPE[row.visitType],
      priority: VisitMapper.TO_DOMAIN_PRIORITY[row.priority],
      status: VisitMapper.TO_DOMAIN_STATUS[row.status],
      tasks,
      specialInstructions: row.specialInstructions,
      medicationAdministrations,
      vitals,
      breaks,
      notes,
      photoKeys: row.photoKeys,
      observation: VisitObservation.create({
        mood: row.observationMood,
        appetite: row.observationAppetite,
        mobility: row.observationMobility,
        medicationStatus: row.observationMedication,
      }),
      clockInAt: row.clockInAt,
      clockOutAt: row.clockOutAt,
      arrivalLocation,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  // `sequence` is a DB generated reference (default autoincrement); it is never part
  // of the domain, so it is omitted here and assigned by the database on insert.
  static toPersistence(visit: Visit): Omit<PrismaVisit, 'sequence'> {
    return {
      id: visit.id,
      caregiverId: visit.caregiverId,
      assignedAt: visit.assignedAt,
      careRecipientId: visit.careRecipientId,
      scheduledDate: visit.scheduledDate,
      startMinute: visit.window.startMinute,
      endMinute: visit.window.endMinute,
      visitType: VisitMapper.TO_PERSISTENCE_TYPE[visit.type],
      priority: VisitMapper.TO_PERSISTENCE_PRIORITY[visit.priority],
      status: VisitMapper.TO_PERSISTENCE_STATUS[visit.status],
      specialInstructions: visit.specialInstructions,
      photoKeys: visit.photoKeys,
      observationMood: visit.observation.mood,
      observationAppetite: visit.observation.appetite,
      observationMobility: visit.observation.mobility,
      observationMedication: visit.observation.medicationStatus,
      clockInAt: visit.clockInAt,
      clockOutAt: visit.clockOutAt,
      arrivalLatitude: visit.arrivalLocation?.latitude ?? null,
      arrivalLongitude: visit.arrivalLocation?.longitude ?? null,
      createdAt: visit.createdAt,
      updatedAt: visit.updatedAt,
    };
  }

  static toTaskRows(visit: Visit): VisitTaskRow[] {
    return visit.tasks.map((task, index) => ({
      label: task.label,
      category: TO_PERSISTENCE_TASK_CATEGORY[task.category],
      completed: task.completed,
      completedAt: task.completedAt,
      startedAt: task.startedAt,
      durationMinutes: task.durationMinutes,
      scheduledMinute: task.scheduledMinute,
      note: task.note,
      position: index,
    }));
  }

  static toAdministrationRows(visit: Visit): MedicationAdministrationRow[] {
    return visit.medicationAdministrations.map((administration) => ({
      medicationId: administration.medicationId,
      outcome: VisitMapper.TO_PERSISTENCE_OUTCOME[administration.outcome],
      note: administration.note,
      visitTaskPosition: administration.visitTaskPosition,
      recordedAt: administration.recordedAt,
    }));
  }

  static toVitalsRows(visit: Visit): VisitVitalsRow[] {
    return visit.vitals.map((reading) => ({
      systolic: reading.systolic,
      diastolic: reading.diastolic,
      heartRate: reading.heartRate,
      oxygenSaturation: reading.oxygenSaturation,
      weightGrams: reading.weightGrams,
      temperatureTenths: reading.temperatureTenths,
      bloodGlucose: reading.bloodGlucose,
      visitTaskPosition: reading.visitTaskPosition,
      recordedAt: reading.recordedAt,
    }));
  }

  static toBreakRows(visit: Visit): VisitBreakRow[] {
    return visit.breaks.map((entry) => ({
      startedAt: entry.startedAt,
      endedAt: entry.endedAt,
    }));
  }

  static toNoteRows(visit: Visit): VisitNoteRow[] {
    return visit.notes.map((note) => ({
      id: note.id,
      source: TO_PERSISTENCE_NOTE_SOURCE[note.source],
      authorId: note.authorId,
      authorAdminId: note.authorAdminId,
      authorName: note.authorName,
      authorRole: note.authorRole,
      audience: VisitMapper.TO_PERSISTENCE_AUDIENCE[note.audience],
      text: note.text,
      acknowledgedAt: note.acknowledgedAt,
      acknowledgedByName: note.acknowledgedByName,
      flaggedForCoordinator: note.flaggedForCoordinator,
      flaggedAt: note.flaggedAt,
      editedAt: note.editedAt,
      createdAt: note.createdAt,
    }));
  }

  static toNoteReplyRows(visit: Visit): VisitNoteReplyRow[] {
    return visit.notes.flatMap((note) =>
      note.replies.map((reply) => ({
        id: reply.id,
        visitNoteId: note.id,
        authorName: reply.authorName,
        authorRole: reply.authorRole,
        text: reply.text,
        createdAt: reply.createdAt,
      })),
    );
  }

  private static readonly TO_DOMAIN_TYPE: Record<PrismaVisitType, VisitType> = {
    PERSONAL_CARE: VisitType.PersonalCare,
    MORNING_CARE: VisitType.MorningCare,
    MEDICATION: VisitType.Medication,
    PHYSICAL_THERAPY: VisitType.PhysicalTherapy,
    WOUND_CARE: VisitType.WoundCare,
    COMPANIONSHIP: VisitType.Companionship,
  };

  private static readonly TO_PERSISTENCE_TYPE: Record<VisitType, PrismaVisitType> = {
    [VisitType.PersonalCare]: 'PERSONAL_CARE',
    [VisitType.MorningCare]: 'MORNING_CARE',
    [VisitType.Medication]: 'MEDICATION',
    [VisitType.PhysicalTherapy]: 'PHYSICAL_THERAPY',
    [VisitType.WoundCare]: 'WOUND_CARE',
    [VisitType.Companionship]: 'COMPANIONSHIP',
  };

  private static readonly TO_DOMAIN_PRIORITY: Record<PrismaVisitPriority, VisitPriority> = {
    LOW: VisitPriority.Low,
    NORMAL: VisitPriority.Normal,
    HIGH: VisitPriority.High,
    URGENT: VisitPriority.Urgent,
    CRITICAL: VisitPriority.Critical,
  };

  private static readonly TO_PERSISTENCE_PRIORITY: Record<VisitPriority, PrismaVisitPriority> = {
    [VisitPriority.Low]: 'LOW',
    [VisitPriority.Normal]: 'NORMAL',
    [VisitPriority.High]: 'HIGH',
    [VisitPriority.Urgent]: 'URGENT',
    [VisitPriority.Critical]: 'CRITICAL',
  };

  private static readonly TO_DOMAIN_STATUS: Record<PrismaVisitStatus, VisitStatus> = {
    SCHEDULED: VisitStatus.Scheduled,
    IN_PROGRESS: VisitStatus.InProgress,
    ON_BREAK: VisitStatus.OnBreak,
    COMPLETED: VisitStatus.Completed,
    CANCELLED: VisitStatus.Cancelled,
    MISSED: VisitStatus.Missed,
  };

  private static readonly TO_PERSISTENCE_STATUS: Record<VisitStatus, PrismaVisitStatus> = {
    [VisitStatus.Scheduled]: 'SCHEDULED',
    [VisitStatus.InProgress]: 'IN_PROGRESS',
    [VisitStatus.OnBreak]: 'ON_BREAK',
    [VisitStatus.Completed]: 'COMPLETED',
    [VisitStatus.Cancelled]: 'CANCELLED',
    [VisitStatus.Missed]: 'MISSED',
  };

  private static readonly TO_DOMAIN_OUTCOME: Record<
    PrismaOutcome,
    MedicationAdministrationOutcome
  > = {
    ADMINISTERED: MedicationAdministrationOutcome.Administered,
    REFUSED: MedicationAdministrationOutcome.Refused,
    OUT_OF_STOCK: MedicationAdministrationOutcome.OutOfStock,
    PATIENT_ASLEEP: MedicationAdministrationOutcome.PatientAsleep,
  };

  private static readonly TO_PERSISTENCE_OUTCOME: Record<
    MedicationAdministrationOutcome,
    PrismaOutcome
  > = {
    [MedicationAdministrationOutcome.Administered]: 'ADMINISTERED',
    [MedicationAdministrationOutcome.Refused]: 'REFUSED',
    [MedicationAdministrationOutcome.OutOfStock]: 'OUT_OF_STOCK',
    [MedicationAdministrationOutcome.PatientAsleep]: 'PATIENT_ASLEEP',
  };

  private static readonly TO_DOMAIN_AUDIENCE: Record<PrismaNoteAudience, NoteAudience> = {
    CARE_TEAM: NoteAudience.CareTeam,
    FAMILY: NoteAudience.Family,
  };

  private static readonly TO_PERSISTENCE_AUDIENCE: Record<NoteAudience, PrismaNoteAudience> = {
    [NoteAudience.CareTeam]: 'CARE_TEAM',
    [NoteAudience.Family]: 'FAMILY',
  };
}
