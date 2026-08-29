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
  temperatureCelsius: number | null;
  recordedAt: string;
}

/** The caregiver's qualitative observations for a visit. */
export interface VisitObservationsResult {
  mood: string | null;
  appetite: string | null;
  mobility: string | null;
  medicationStatus: string | null;
}

/** One note on a visit's feed, as written by a caregiver. */
export interface VisitNoteResult {
  authorId: string;
  audience: string;
  text: string;
  createdAt: string;
}

/** The notes feed on a visit, oldest first. */
export interface VisitNotesResult {
  notes: VisitNoteResult[];
}

/** The attached photo keys on a visit. */
export interface VisitPhotosResult {
  photoKeys: string[];
}

export function toVisitObservationsResult(visit: Visit): VisitObservationsResult {
  return {
    mood: visit.observation.mood,
    appetite: visit.observation.appetite,
    mobility: visit.observation.mobility,
    medicationStatus: visit.observation.medicationStatus,
  };
}

/** The checklist state after a task completion change. */
export interface VisitTasksResult {
  tasks: { label: string; completed: boolean; durationMinutes: number | null }[];
}

export function toVisitNotesResult(visit: Visit): VisitNotesResult {
  return {
    notes: visit.notes.map((note) => ({
      authorId: note.authorId,
      audience: String(note.audience),
      text: note.text,
      createdAt: note.createdAt.toISOString(),
    })),
  };
}

export function toVisitPhotosResult(visit: Visit): VisitPhotosResult {
  return { photoKeys: visit.photoKeys };
}

export function toVisitTasksResult(visit: Visit): VisitTasksResult {
  return {
    tasks: visit.tasks.map((task) => ({
      label: task.label,
      completed: task.completed,
      durationMinutes: task.durationMinutes,
    })),
  };
}
