import {
  MedicationAdministration as PrismaMedicationAdministration,
  MedicationAdministrationOutcome as PrismaOutcome,
  NoteAudience as PrismaNoteAudience,
  Visit as PrismaVisit,
  VisitBreak as PrismaVisitBreak,
  VisitNote as PrismaVisitNote,
  VisitPriority as PrismaVisitPriority,
  VisitStatus as PrismaVisitStatus,
  VisitTask as PrismaVisitTask,
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
import { VisitObservation } from '../../domain/value-objects/visit-observation.vo';
import { VisitTask } from '../../domain/value-objects/visit-task.vo';
import { VisitWindow } from '../../domain/value-objects/visit-window.vo';
import { VitalsReading } from '../../domain/value-objects/vitals-reading.vo';

type VisitRow = PrismaVisit & {
  tasks: PrismaVisitTask[];
  medicationAdministrations: PrismaMedicationAdministration[];
  vitals: PrismaVisitVitals[];
  breaks: PrismaVisitBreak[];
  notes: PrismaVisitNote[];
};

/** Persisted shape of a single task, ready to write under its parent visit. */
export interface VisitTaskRow {
  label: string;
  completed: boolean;
  completedAt: Date | null;
  durationMinutes: number | null;
  position: number;
}

/** Persisted shape of one medication administration under its parent visit. */
export interface MedicationAdministrationRow {
  medicationId: string;
  outcome: PrismaOutcome;
  note: string | null;
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
  recordedAt: Date;
}

/** Persisted shape of one break interval under its parent visit. */
export interface VisitBreakRow {
  startedAt: Date;
  endedAt: Date | null;
}

/** Persisted shape of one note under its parent visit. */
export interface VisitNoteRow {
  authorId: string;
  audience: PrismaNoteAudience;
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
        VisitTask.create(task.label, task.completed, task.completedAt, task.durationMinutes),
      );

    const medicationAdministrations = [...row.medicationAdministrations]
      .sort((a, b) => a.recordedAt.getTime() - b.recordedAt.getTime())
      .map((administration) =>
        MedicationAdministration.create({
          medicationId: administration.medicationId,
          outcome: VisitMapper.TO_DOMAIN_OUTCOME[administration.outcome],
          note: administration.note,
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
          recordedAt: reading.recordedAt,
        }),
      );

    const breaks = [...row.breaks]
      .sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime())
      .map((entry) => VisitBreak.rehydrate(entry.startedAt, entry.endedAt));

    const notes = [...row.notes]
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((note) =>
        VisitNote.create({
          authorId: note.authorId,
          audience: VisitMapper.TO_DOMAIN_AUDIENCE[note.audience],
          text: note.text,
          createdAt: note.createdAt,
        }),
      );

    const arrivalLocation =
      row.arrivalLatitude === null || row.arrivalLongitude === null
        ? null
        : Coordinates.create(row.arrivalLatitude, row.arrivalLongitude);

    return Visit.rehydrate(row.id, {
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

  static toPersistence(visit: Visit): PrismaVisit {
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
      completed: task.completed,
      completedAt: task.completedAt,
      durationMinutes: task.durationMinutes,
      position: index,
    }));
  }

  static toAdministrationRows(visit: Visit): MedicationAdministrationRow[] {
    return visit.medicationAdministrations.map((administration) => ({
      medicationId: administration.medicationId,
      outcome: VisitMapper.TO_PERSISTENCE_OUTCOME[administration.outcome],
      note: administration.note,
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
      authorId: note.authorId,
      audience: VisitMapper.TO_PERSISTENCE_AUDIENCE[note.audience],
      text: note.text,
      createdAt: note.createdAt,
    }));
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
  };

  private static readonly TO_PERSISTENCE_PRIORITY: Record<VisitPriority, PrismaVisitPriority> = {
    [VisitPriority.Low]: 'LOW',
    [VisitPriority.Normal]: 'NORMAL',
    [VisitPriority.High]: 'HIGH',
    [VisitPriority.Urgent]: 'URGENT',
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
