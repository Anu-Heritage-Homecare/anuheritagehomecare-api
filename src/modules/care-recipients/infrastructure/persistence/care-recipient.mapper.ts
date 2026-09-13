import {
  CareRecipient as PrismaCareRecipient,
  CareFrequency as PrismaCareFrequency,
  CareNeed as PrismaCareNeed,
  CareRecipientPriority as PrismaPriority,
  CareRecipientStatus as PrismaStatus,
  Gender as PrismaGender,
  Medication as PrismaMedication,
  MedicationStatus as PrismaMedicationStatus,
  OnboardingStep as PrismaOnboardingStep,
  Weekday as PrismaWeekday,
} from '@prisma/client';
import { CareRecipient } from '../../domain/care-recipient.entity';
import { CareFrequency } from '../../domain/care-frequency.enum';
import { CareNeed } from '../../domain/care-need.enum';
import { CareRecipientPriority } from '../../domain/care-recipient-priority.enum';
import { CareRecipientStatus } from '../../domain/care-recipient-status.enum';
import { Gender } from '../../domain/gender.enum';
import { Medication } from '../../domain/medication.entity';
import { MedicationStatus } from '../../domain/medication-status.enum';
import { OnboardingStep } from '../../domain/onboarding-step.enum';
import { Weekday } from '../../domain/weekday.enum';
import { CareSchedule } from '../../domain/value-objects/care-schedule.vo';
import { HealthInformation } from '../../domain/value-objects/health-information.vo';
import { RecipientProfile } from '../../domain/value-objects/recipient-profile.vo';

type CareRecipientRow = PrismaCareRecipient & { medications: PrismaMedication[] };

/** Persisted shape of a single medication, ready to write under its recipient. */
export interface MedicationRow {
  id: string;
  name: string;
  dose: string | null;
  scheduleMinute: number | null;
  purpose: string | null;
  prescribedBy: string | null;
  startDate: Date | null;
  instructions: string | null;
  doseTimes: number[];
  status: PrismaMedicationStatus;
  discontinuedAt: Date | null;
  position: number;
}

/**
 * Translates between the Prisma CareRecipient row (with its medication rows) and
 * the aggregate. The only place that knows both shapes, so the domain stays free
 * of Prisma types. Health and schedule sections are null in the domain until
 * their wizard step is done; medications are ordered by their stored position.
 */
export class CareRecipientMapper {
  static toDomain(row: CareRecipientRow): CareRecipient {
    const profile = RecipientProfile.create({
      name: row.name,
      gender: CareRecipientMapper.TO_DOMAIN_GENDER[row.gender],
      dateOfBirth: row.dateOfBirth,
      city: row.city,
      state: row.state,
      fullAddress: row.fullAddress,
      relationship: row.relationship,
      livingSituation: row.livingSituation,
      photoKey: row.photoKey,
      latitude: row.latitude,
      longitude: row.longitude,
    });

    const health =
      row.needsMedicationHelp === null
        ? null
        : HealthInformation.create({
            medicalConditions: row.medicalConditions,
            allergies: row.allergies,
            needsMedicationHelp: row.needsMedicationHelp,
          });

    const medications = [...row.medications]
      .sort((a, b) => a.position - b.position)
      .map((medication) =>
        Medication.create({
          id: medication.id,
          name: medication.name,
          dose: medication.dose,
          scheduleMinute: medication.scheduleMinute,
          purpose: medication.purpose,
          prescribedBy: medication.prescribedBy,
          startDate: medication.startDate,
          instructions: medication.instructions,
          doseTimes: medication.doseTimes,
          status: CareRecipientMapper.TO_DOMAIN_MEDICATION_STATUS[medication.status],
          discontinuedAt: medication.discontinuedAt,
        }),
      );

    const schedule =
      row.careFrequency === null || row.estimatedStartDate === null || row.expectedDuration === null
        ? null
        : CareSchedule.create({
            frequency: CareRecipientMapper.TO_DOMAIN_FREQUENCY[row.careFrequency],
            estimatedStartDate: row.estimatedStartDate,
            expectedDuration: row.expectedDuration,
            days: row.careDays.map((day) => CareRecipientMapper.TO_DOMAIN_WEEKDAY[day]),
            startMinute: row.careStartMinute,
            visitDurationMinutes: row.careVisitDurationMinutes,
          });

    return CareRecipient.rehydrate(row.id, {
      ownerId: row.ownerId,
      status: CareRecipientMapper.TO_DOMAIN_STATUS[row.status],
      onboardingStep: CareRecipientMapper.TO_DOMAIN_STEP[row.onboardingStep],
      profile,
      careNeeds: row.careNeeds.map((need) => CareRecipientMapper.TO_DOMAIN_NEED[need]),
      health,
      medications,
      schedule,
      priority: CareRecipientMapper.TO_DOMAIN_PRIORITY[row.priority],
      primaryCaregiverId: row.primaryCaregiverId,
      completedAt: row.completedAt,
      dischargedAt: row.dischargedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  // `recipientNumber` is database assigned (autoincrement) and never written from
  // the domain, so it is omitted from the persistence shape.
  static toPersistence(recipient: CareRecipient): Omit<PrismaCareRecipient, 'recipientNumber'> {
    const profile = recipient.profile;
    const health = recipient.health;
    const schedule = recipient.schedule;

    return {
      id: recipient.id,
      ownerId: recipient.ownerId,
      status: CareRecipientMapper.TO_PERSISTENCE_STATUS[recipient.status],
      onboardingStep: CareRecipientMapper.TO_PERSISTENCE_STEP[recipient.onboardingStep],
      name: profile.name,
      gender: CareRecipientMapper.TO_PERSISTENCE_GENDER[profile.gender],
      dateOfBirth: profile.dateOfBirth,
      city: profile.city,
      state: profile.state,
      fullAddress: profile.fullAddress,
      relationship: profile.relationship,
      livingSituation: profile.livingSituation,
      photoKey: profile.photoKey,
      latitude: profile.location?.latitude ?? null,
      longitude: profile.location?.longitude ?? null,
      careNeeds: recipient.careNeeds.map((need) => CareRecipientMapper.TO_PERSISTENCE_NEED[need]),
      medicalConditions: health?.medicalConditions ?? [],
      allergies: health?.allergies ?? [],
      needsMedicationHelp: health === null ? null : health.needsMedicationHelp,
      careFrequency:
        schedule === null ? null : CareRecipientMapper.TO_PERSISTENCE_FREQUENCY[schedule.frequency],
      estimatedStartDate: schedule?.estimatedStartDate ?? null,
      expectedDuration: schedule?.expectedDuration ?? null,
      careDays: (schedule?.days ?? []).map(
        (day) => CareRecipientMapper.TO_PERSISTENCE_WEEKDAY[day],
      ),
      careStartMinute: schedule?.startMinute ?? null,
      careVisitDurationMinutes: schedule?.visitDurationMinutes ?? null,
      priority: CareRecipientMapper.TO_PERSISTENCE_PRIORITY[recipient.priority],
      primaryCaregiverId: recipient.primaryCaregiverId,
      completedAt: recipient.completedAt,
      dischargedAt: recipient.dischargedAt,
      createdAt: recipient.createdAt,
      updatedAt: recipient.updatedAt,
    };
  }

  static toMedicationRows(recipient: CareRecipient): MedicationRow[] {
    return recipient.medications.map((medication, index) => ({
      id: medication.id,
      name: medication.name,
      dose: medication.dose,
      scheduleMinute: medication.scheduleMinute,
      purpose: medication.purpose,
      prescribedBy: medication.prescribedBy,
      startDate: medication.startDate,
      instructions: medication.instructions,
      doseTimes: medication.doseTimes,
      status: CareRecipientMapper.TO_PERSISTENCE_MEDICATION_STATUS[medication.status],
      discontinuedAt: medication.discontinuedAt,
      position: index,
    }));
  }

  private static readonly TO_DOMAIN_STATUS: Record<PrismaStatus, CareRecipientStatus> = {
    DRAFT: CareRecipientStatus.Draft,
    ACTIVE: CareRecipientStatus.Active,
    ON_HOLD: CareRecipientStatus.OnHold,
    DISCHARGED: CareRecipientStatus.Discharged,
  };

  private static readonly TO_PERSISTENCE_STATUS: Record<CareRecipientStatus, PrismaStatus> = {
    [CareRecipientStatus.Draft]: 'DRAFT',
    [CareRecipientStatus.Active]: 'ACTIVE',
    [CareRecipientStatus.OnHold]: 'ON_HOLD',
    [CareRecipientStatus.Discharged]: 'DISCHARGED',
  };

  private static readonly TO_DOMAIN_PRIORITY: Record<PrismaPriority, CareRecipientPriority> = {
    CRITICAL: CareRecipientPriority.Critical,
    URGENT: CareRecipientPriority.Urgent,
    HIGH: CareRecipientPriority.High,
    MEDIUM: CareRecipientPriority.Medium,
    NORMAL: CareRecipientPriority.Normal,
    LOW: CareRecipientPriority.Low,
  };

  private static readonly TO_PERSISTENCE_PRIORITY: Record<CareRecipientPriority, PrismaPriority> = {
    [CareRecipientPriority.Critical]: 'CRITICAL',
    [CareRecipientPriority.Urgent]: 'URGENT',
    [CareRecipientPriority.High]: 'HIGH',
    [CareRecipientPriority.Medium]: 'MEDIUM',
    [CareRecipientPriority.Normal]: 'NORMAL',
    [CareRecipientPriority.Low]: 'LOW',
  };

  private static readonly TO_DOMAIN_STEP: Record<PrismaOnboardingStep, OnboardingStep> = {
    PROFILE: OnboardingStep.Profile,
    CARE_NEEDS: OnboardingStep.CareNeeds,
    HEALTH: OnboardingStep.Health,
    SCHEDULE: OnboardingStep.Schedule,
    REVIEW: OnboardingStep.Review,
    COMPLETED: OnboardingStep.Completed,
  };

  private static readonly TO_PERSISTENCE_STEP: Record<OnboardingStep, PrismaOnboardingStep> = {
    [OnboardingStep.Profile]: 'PROFILE',
    [OnboardingStep.CareNeeds]: 'CARE_NEEDS',
    [OnboardingStep.Health]: 'HEALTH',
    [OnboardingStep.Schedule]: 'SCHEDULE',
    [OnboardingStep.Review]: 'REVIEW',
    [OnboardingStep.Completed]: 'COMPLETED',
  };

  private static readonly TO_DOMAIN_MEDICATION_STATUS: Record<
    PrismaMedicationStatus,
    MedicationStatus
  > = {
    ACTIVE: MedicationStatus.Active,
    DISCONTINUED: MedicationStatus.Discontinued,
  };

  private static readonly TO_PERSISTENCE_MEDICATION_STATUS: Record<
    MedicationStatus,
    PrismaMedicationStatus
  > = {
    [MedicationStatus.Active]: 'ACTIVE',
    [MedicationStatus.Discontinued]: 'DISCONTINUED',
  };

  private static readonly TO_DOMAIN_GENDER: Record<PrismaGender, Gender> = {
    MALE: Gender.Male,
    FEMALE: Gender.Female,
  };

  private static readonly TO_PERSISTENCE_GENDER: Record<Gender, PrismaGender> = {
    [Gender.Male]: 'MALE',
    [Gender.Female]: 'FEMALE',
  };

  private static readonly TO_DOMAIN_NEED: Record<PrismaCareNeed, CareNeed> = {
    BATHING: CareNeed.Bathing,
    DRESSING: CareNeed.Dressing,
    GROOMING: CareNeed.Grooming,
    TOILETING: CareNeed.Toileting,
    MEAL_PREPARATION: CareNeed.MealPreparation,
    HOUSEKEEPING: CareNeed.Housekeeping,
    LAUNDRY: CareNeed.Laundry,
    SHOPPING: CareNeed.Shopping,
  };

  private static readonly TO_PERSISTENCE_NEED: Record<CareNeed, PrismaCareNeed> = {
    [CareNeed.Bathing]: 'BATHING',
    [CareNeed.Dressing]: 'DRESSING',
    [CareNeed.Grooming]: 'GROOMING',
    [CareNeed.Toileting]: 'TOILETING',
    [CareNeed.MealPreparation]: 'MEAL_PREPARATION',
    [CareNeed.Housekeeping]: 'HOUSEKEEPING',
    [CareNeed.Laundry]: 'LAUNDRY',
    [CareNeed.Shopping]: 'SHOPPING',
  };

  private static readonly TO_DOMAIN_FREQUENCY: Record<PrismaCareFrequency, CareFrequency> = {
    ONE_TIME_VISIT: CareFrequency.OneTimeVisit,
    DAILY: CareFrequency.Daily,
    WEEKLY: CareFrequency.Weekly,
    LIVE_IN_CARE: CareFrequency.LiveInCare,
  };

  private static readonly TO_PERSISTENCE_FREQUENCY: Record<CareFrequency, PrismaCareFrequency> = {
    [CareFrequency.OneTimeVisit]: 'ONE_TIME_VISIT',
    [CareFrequency.Daily]: 'DAILY',
    [CareFrequency.Weekly]: 'WEEKLY',
    [CareFrequency.LiveInCare]: 'LIVE_IN_CARE',
  };

  private static readonly TO_DOMAIN_WEEKDAY: Record<PrismaWeekday, Weekday> = {
    MONDAY: Weekday.Monday,
    TUESDAY: Weekday.Tuesday,
    WEDNESDAY: Weekday.Wednesday,
    THURSDAY: Weekday.Thursday,
    FRIDAY: Weekday.Friday,
    SATURDAY: Weekday.Saturday,
    SUNDAY: Weekday.Sunday,
  };

  private static readonly TO_PERSISTENCE_WEEKDAY: Record<Weekday, PrismaWeekday> = {
    [Weekday.Monday]: 'MONDAY',
    [Weekday.Tuesday]: 'TUESDAY',
    [Weekday.Wednesday]: 'WEDNESDAY',
    [Weekday.Thursday]: 'THURSDAY',
    [Weekday.Friday]: 'FRIDAY',
    [Weekday.Saturday]: 'SATURDAY',
    [Weekday.Sunday]: 'SUNDAY',
  };
}
