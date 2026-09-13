/**
 * The kind of entry on a care recipient's health timeline. Drives the category
 * badge and the timeline filter tabs on the admin Health screen. APPOINTMENT and
 * SPECIALIST are the future facing entries the Next Appointment card reads.
 */
export enum HealthEventCategory {
  Vitals = 'VITALS',
  Alert = 'ALERT',
  Medication = 'MEDICATION',
  Incident = 'INCIDENT',
  Assessment = 'ASSESSMENT',
  Appointment = 'APPOINTMENT',
  Specialist = 'SPECIALIST',
  Care = 'CARE',
}

/** Every valid category, used to validate incoming values at the boundary. */
export const ALL_HEALTH_EVENT_CATEGORIES: readonly HealthEventCategory[] =
  Object.values(HealthEventCategory);

/** The categories treated as appointments for the Next Appointment card. */
export const APPOINTMENT_CATEGORIES: readonly HealthEventCategory[] = [
  HealthEventCategory.Appointment,
  HealthEventCategory.Specialist,
];
