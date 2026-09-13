export interface MedicationsSummaryResult {
  activeMedications: number;
  /** Overall adherence over the recent window, as a percentage, or null if none recorded. */
  adherenceRatePercent: number | null;
  /** Change in adherence against the prior window, in percentage points. */
  adherenceTrendPoints: number | null;
  nextDose: NextDoseResult | null;
  activeAlerts: number;
  /** The first clinical warning's title, as the alert subtitle. */
  alertSummary: string | null;
}

export interface NextDoseResult {
  /** The dose time today or the next day it is due. */
  at: Date;
  minute: number;
  /** The medications due at that time, for example "Donepezil (10mg)". */
  label: string;
}

export interface LastAdministeredResult {
  at: Date;
  caregiverName: string | null;
}

export interface PrescriptionResult {
  id: string;
  name: string;
  dose: string | null;
  purpose: string | null;
  status: string;
  scheduleLabel: string;
  prescribedBy: string | null;
  startDate: Date | null;
  adherencePercent: number | null;
  lastAdministered: LastAdministeredResult | null;
  /** A recent non administered dose, surfaced as a caution (for example a missed dose). */
  alert: string | null;
}

export interface ScheduleDoseMedicationResult {
  name: string;
  dose: string | null;
}

export interface ScheduleDoseResult {
  minute: number;
  timeLabel: string;
  periodLabel: string;
  medications: ScheduleDoseMedicationResult[];
  administered: boolean;
  caregiverName: string | null;
}

export interface MedicationWarningResult {
  title: string;
  detail: string;
}

export interface MedicationAuditResult {
  at: Date;
  title: string;
  detail: string;
  authorName: string | null;
}

export interface RecipientMedicationsResult {
  summary: MedicationsSummaryResult;
  prescriptions: PrescriptionResult[];
  todaysSchedule: ScheduleDoseResult[];
  warnings: MedicationWarningResult[];
  audits: MedicationAuditResult[];
}
