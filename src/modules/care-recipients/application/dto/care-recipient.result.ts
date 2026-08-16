import { CareRecipient } from '../../domain/care-recipient.entity';
import { CareFrequency } from '../../domain/care-frequency.enum';
import { CareNeed } from '../../domain/care-need.enum';
import { CareRecipientStatus } from '../../domain/care-recipient-status.enum';
import { Gender } from '../../domain/gender.enum';
import { OnboardingStep } from '../../domain/onboarding-step.enum';

/** Flat, serialisable projection of a care recipient for the presentation layer. */
export interface CareRecipientResult {
  id: string;
  ownerId: string;
  status: CareRecipientStatus;
  nextStep: OnboardingStep;
  name: string;
  gender: Gender;
  dateOfBirth: string;
  city: string;
  state: string;
  fullAddress: string;
  relationship: string;
  livingSituation: string;
  photoKey: string | null;
  latitude: number | null;
  longitude: number | null;
  careNeeds: CareNeed[];
  health: {
    medicalConditions: string[];
    allergies: string[];
    needsMedicationHelp: boolean;
    medications: string[];
  } | null;
  schedule: {
    frequency: CareFrequency;
    estimatedStartDate: string;
    expectedDuration: string;
  } | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Format a date as an ISO calendar date (no time component). */
function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function toCareRecipientResult(recipient: CareRecipient): CareRecipientResult {
  const profile = recipient.profile;
  const health = recipient.health;
  const schedule = recipient.schedule;

  return {
    id: recipient.id,
    ownerId: recipient.ownerId,
    status: recipient.status,
    nextStep: recipient.onboardingStep,
    name: profile.name,
    gender: profile.gender,
    dateOfBirth: toIsoDate(profile.dateOfBirth),
    city: profile.city,
    state: profile.state,
    fullAddress: profile.fullAddress,
    relationship: profile.relationship,
    livingSituation: profile.livingSituation,
    photoKey: profile.photoKey,
    latitude: profile.location?.latitude ?? null,
    longitude: profile.location?.longitude ?? null,
    careNeeds: recipient.careNeeds,
    health:
      health === null
        ? null
        : {
            medicalConditions: health.medicalConditions,
            allergies: health.allergies,
            needsMedicationHelp: health.needsMedicationHelp,
            medications: health.medications,
          },
    schedule:
      schedule === null
        ? null
        : {
            frequency: schedule.frequency,
            estimatedStartDate: toIsoDate(schedule.estimatedStartDate),
            expectedDuration: schedule.expectedDuration,
          },
    completedAt: recipient.completedAt === null ? null : recipient.completedAt.toISOString(),
    createdAt: recipient.createdAt.toISOString(),
    updatedAt: recipient.updatedAt.toISOString(),
  };
}
