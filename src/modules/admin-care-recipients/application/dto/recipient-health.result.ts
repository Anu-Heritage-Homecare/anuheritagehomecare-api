export interface PrimaryConditionsResult {
  primary: string | null;
  others: string[];
}

export interface LastVitalsResult {
  systolic: number | null;
  diastolic: number | null;
  heartRate: number | null;
  oxygenSaturation: number | null;
  weightGrams: number | null;
  temperatureCelsius: number | null;
  bloodGlucose: number | null;
  recordedAt: Date;
}

export interface NextAppointmentResult {
  providerName: string | null;
  title: string;
  description: string;
  at: Date;
}

export interface TrendSeriesResult {
  latest: number | null;
  series: number[];
}

export interface BloodPressureTrendResult {
  latestSystolic: number | null;
  latestDiastolic: number | null;
  systolicSeries: number[];
}

export interface VitalsTrendResult {
  bloodPressure: BloodPressureTrendResult;
  heartRate: TrendSeriesResult;
  bloodGlucose: TrendSeriesResult;
  weightGrams: TrendSeriesResult;
  oxygen: TrendSeriesResult;
}

export interface HealthTimelineEventResult {
  id: string;
  category: string;
  title: string;
  description: string;
  recordedByName: string | null;
  recordedByRole: string | null;
  occurredAt: Date;
}

export interface HealthTimelineResult {
  items: HealthTimelineEventResult[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface RecipientHealthResult {
  primaryConditions: PrimaryConditionsResult;
  lastVitals: LastVitalsResult | null;
  nextAppointment: NextAppointmentResult | null;
  vitalsTrend: VitalsTrendResult;
  timeline: HealthTimelineResult;
}
