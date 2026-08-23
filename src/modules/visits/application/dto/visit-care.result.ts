import { MedicationAdministrationOutcome } from '../../domain/medication-administration-outcome.enum';
import { Visit } from '../../domain/visit.entity';

/** The recorded outcome for one medication on a visit. */
export interface MedicationAdministrationResult {
  medicationId: string;
  outcome: MedicationAdministrationOutcome;
  note: string | null;
  recordedAt: string;
}

/** One set of vital signs recorded during a visit. */
export interface VitalsReadingResult {
  systolic: number | null;
  diastolic: number | null;
  heartRate: number | null;
  oxygenSaturation: number | null;
  weightGrams: number | null;
  recordedAt: string;
}

/** The notes and attached photo keys saved on a visit. */
export interface VisitNotesResult {
  visitNote: string | null;
  familyNote: string | null;
  photoKeys: string[];
}

/** The checklist state after a task completion change. */
export interface VisitTasksResult {
  tasks: { label: string; completed: boolean }[];
}

export function toVisitNotesResult(visit: Visit): VisitNotesResult {
  return {
    visitNote: visit.visitNote,
    familyNote: visit.familyNote,
    photoKeys: visit.photoKeys,
  };
}

export function toVisitTasksResult(visit: Visit): VisitTasksResult {
  return {
    tasks: visit.tasks.map((task) => ({ label: task.label, completed: task.completed })),
  };
}
