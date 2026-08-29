import { MedicationAdministrationOutcome } from '../../domain/medication-administration-outcome.enum';
import { VisitStatus } from '../../domain/visit-status.enum';

/** One medication on the schedule joined with its recorded outcome for the visit. */
export interface VisitMedicationResult {
  id: string;
  name: string;
  dose: string | null;
  scheduleMinute: number | null;
  administration: {
    outcome: MedicationAdministrationOutcome;
    note: string | null;
    recordedAt: string;
  } | null;
}

/** One set of vitals recorded during the visit. */
export interface VisitVitalsResult {
  systolic: number | null;
  diastolic: number | null;
  heartRate: number | null;
  oxygenSaturation: number | null;
  weightGrams: number | null;
  temperatureCelsius: number | null;
  recordedAt: string;
}

/** The full appointment detail a caregiver sees when opening a visit. */
export interface VisitDetailResult {
  id: string;
  status: VisitStatus;
  date: string;
  startMinute: number;
  endMinute: number;
  clockInAt: string | null;
  clockOutAt: string | null;
  breakSeconds: number;
  onBreakSince: string | null;
  address: string;
  recipient: {
    id: string;
    name: string;
    gender: string;
    age: number;
    photoKey: string | null;
  };
  tasks: { label: string; completed: boolean }[];
  specialInstructions: string[];
  healthNote: {
    medicalConditions: string[];
    allergies: string[];
  };
  medications: VisitMedicationResult[];
  vitals: VisitVitalsResult[];
  observation: {
    mood: string | null;
    appetite: string | null;
    mobility: string | null;
    medicationStatus: string | null;
  };
  notes: {
    authorId: string;
    audience: string;
    text: string;
    createdAt: string;
  }[];
  photoKeys: string[];
  emergencyContact: {
    name: string;
    phone: string;
  } | null;
}
