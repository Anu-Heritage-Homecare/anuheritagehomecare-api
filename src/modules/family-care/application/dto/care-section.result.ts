/** A vital reading with a simple normal/attention classification. */
export interface VitalStatusResult<T> {
  value: T;
  status: 'NORMAL' | 'ATTENTION';
}

export interface CareOverviewResult {
  recipient: { id: string; name: string; gender: string; age: number; photoKey: string | null };
  carePlanName: string | null;
  caregiver: { id: string; name: string } | null;
  currentVisitId: string | null;
  summary: {
    tasks: { completed: number; total: number };
    medications: { completed: number; total: number };
    hasVitals: boolean;
    notesCount: number;
    photosCount: number;
  };
}

export interface RecipientHealthResult {
  recordedAt: string | null;
  vitals: {
    bloodPressure: VitalStatusResult<{ systolic: number; diastolic: number }> | null;
    heartRate: VitalStatusResult<number> | null;
    temperatureCelsius: VitalStatusResult<number> | null;
    oxygenSaturation: VitalStatusResult<number> | null;
  };
  observation: {
    mood: string | null;
    appetite: string | null;
    mobility: string | null;
    medicationStatus: string | null;
  };
}

export interface CarePlanResult {
  planName: string | null;
  goals: { label: string; achieved: boolean }[];
  services: string[];
  schedule: {
    frequency: string;
    startDate: string;
    expectedDuration: string;
    days: string[];
    startTime: string | null;
    visitDurationHours: number | null;
  } | null;
  caregivers: {
    primary: { id: string; name: string } | null;
    backup: { id: string; name: string } | null;
    coordinator: { id: string; name: string } | null;
  };
  careInstructions: string | null;
}
