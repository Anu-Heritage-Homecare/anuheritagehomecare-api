import {
  CareRecipient as PrismaCareRecipient,
  CareFrequency as PrismaCareFrequency,
  CareNeed as PrismaCareNeed,
  CareRecipientStatus as PrismaStatus,
  Gender as PrismaGender,
  OnboardingStep as PrismaOnboardingStep,
} from '@prisma/client';
import { CareRecipient } from '../../domain/care-recipient.entity';
import { CareFrequency } from '../../domain/care-frequency.enum';
import { CareNeed } from '../../domain/care-need.enum';
import { CareRecipientStatus } from '../../domain/care-recipient-status.enum';
import { Gender } from '../../domain/gender.enum';
import { OnboardingStep } from '../../domain/onboarding-step.enum';
import { CareSchedule } from '../../domain/value-objects/care-schedule.vo';
import { HealthInformation } from '../../domain/value-objects/health-information.vo';
import { RecipientProfile } from '../../domain/value-objects/recipient-profile.vo';

/**
 * Translates between the Prisma CareRecipient row and the aggregate. The only
 * place that knows both shapes, so the domain stays free of Prisma types. Health
 * and schedule sections are null in the domain until their wizard step is done.
 */
export class CareRecipientMapper {
  static toDomain(row: PrismaCareRecipient): CareRecipient {
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
            medications: row.medications,
          });

    const schedule =
      row.careFrequency === null || row.estimatedStartDate === null || row.expectedDuration === null
        ? null
        : CareSchedule.create({
            frequency: CareRecipientMapper.TO_DOMAIN_FREQUENCY[row.careFrequency],
            estimatedStartDate: row.estimatedStartDate,
            expectedDuration: row.expectedDuration,
          });

    return CareRecipient.rehydrate(row.id, {
      ownerId: row.ownerId,
      status: CareRecipientMapper.TO_DOMAIN_STATUS[row.status],
      onboardingStep: CareRecipientMapper.TO_DOMAIN_STEP[row.onboardingStep],
      profile,
      careNeeds: row.careNeeds.map((need) => CareRecipientMapper.TO_DOMAIN_NEED[need]),
      health,
      schedule,
      completedAt: row.completedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  static toPersistence(recipient: CareRecipient): PrismaCareRecipient {
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
      medications: health?.medications ?? [],
      careFrequency:
        schedule === null ? null : CareRecipientMapper.TO_PERSISTENCE_FREQUENCY[schedule.frequency],
      estimatedStartDate: schedule?.estimatedStartDate ?? null,
      expectedDuration: schedule?.expectedDuration ?? null,
      completedAt: recipient.completedAt,
      createdAt: recipient.createdAt,
      updatedAt: recipient.updatedAt,
    };
  }

  private static readonly TO_DOMAIN_STATUS: Record<PrismaStatus, CareRecipientStatus> = {
    DRAFT: CareRecipientStatus.Draft,
    ACTIVE: CareRecipientStatus.Active,
  };

  private static readonly TO_PERSISTENCE_STATUS: Record<CareRecipientStatus, PrismaStatus> = {
    [CareRecipientStatus.Draft]: 'DRAFT',
    [CareRecipientStatus.Active]: 'ACTIVE',
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
}
