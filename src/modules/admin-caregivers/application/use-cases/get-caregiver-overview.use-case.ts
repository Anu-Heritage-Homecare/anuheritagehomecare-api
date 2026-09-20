import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import {
  CAREGIVER_READ_MODEL,
  CaregiverOverviewView,
  CaregiverReadModel,
} from '../ports/caregiver-read.port';
import { CaregiverOverviewResult } from '../dto/caregiver.result';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/**
 * The caregiver Overview tab: the profile composed with personal information,
 * current assignments, today's schedule, the performance summary, certifications,
 * skills and this week's availability. Read only.
 */
@Injectable()
export class GetCaregiverOverviewUseCase {
  constructor(
    @Inject(CAREGIVER_READ_MODEL) private readonly reads: CaregiverReadModel,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(profileId: string): Promise<CaregiverOverviewResult> {
    const now = this.clock.now();
    const view = await this.reads.overview(profileId, now);
    if (view === null) {
      throw new NotFoundDomainException('Caregiver not found');
    }

    const perf = view.performance;
    const total = perf.completedVisits + perf.missedVisits;
    const certifications = view.certifications.map((c) => ({
      id: c.id,
      name: c.name,
      licenseNumber: c.licenseNumber,
      issuedAt: c.issuedAt === null ? null : c.issuedAt.toISOString(),
      expiresAt: c.expiresAt.toISOString(),
      valid: c.valid,
    }));

    return {
      id: view.id,
      reference: view.reference,
      name: view.name,
      status: String(view.status),
      title: view.title,
      branch: view.branch,
      employmentType: view.employmentType === null ? null : String(view.employmentType),
      experienceYears: view.experienceYears,
      joinedAt: view.joinedAt === null ? null : view.joinedAt.toISOString(),
      supervisorName: view.supervisorName,
      maxHoursPerWeek: view.maxHoursPerWeek,
      preferredShift: view.preferredShift,
      preferencesNote: view.preferencesNote,
      personal: {
        gender: view.gender === null ? null : String(view.gender),
        phone: view.phone,
        email: view.email,
        address: view.address,
        dateOfBirth: view.dateOfBirth === null ? null : view.dateOfBirth.toISOString(),
        age: ageInYears(view.dateOfBirth, now),
        languages: view.languages,
        emergencyContactName: view.emergencyContactName,
        emergencyContactPhone: view.emergencyContactPhone,
        emergencyContactRelationship: view.emergencyContactRelationship,
        emergencyContactEmail: view.emergencyContactEmail,
      },
      assignments: view.assignments.map((a) => ({
        recipientName: a.recipientName,
        role: a.role,
        since: a.since.toISOString(),
      })),
      todaySchedule: view.todaySchedule.map((v) => ({
        time: formatMinute(v.startMinute),
        recipientName: v.recipientName,
        visitType: v.visitType,
        status: v.status,
      })),
      performance: {
        ratingAverage: perf.ratingAverage,
        ratingCount: perf.ratingCount,
        satisfactionPercent:
          perf.ratingAverage === null ? null : Math.round((perf.ratingAverage / 5) * 100),
        taskCompletionPercent:
          total === 0 ? null : Math.round((perf.completedVisits / total) * 100),
        punctualityPercent: null,
        visitsThisMonth: perf.visitsThisMonth,
        hoursLogged: Math.round(perf.hoursLoggedTenths / 10),
        missedVisits: perf.missedVisits,
      },
      certifications,
      fullyCompliant: certifications.length > 0 && certifications.every((c) => c.valid),
      skills: view.skills,
      availability: this.buildAvailability(view),
      recentNotes: view.recentNotes.map((note) => ({
        body: note.body,
        authorName: note.authorName,
        createdAt: note.createdAt.toISOString(),
      })),
    };
  }

  private buildAvailability(view: CaregiverOverviewView): CaregiverOverviewResult['availability'] {
    const byDay = new Map(view.availability.map((day) => [dayKey(day.date), day]));
    return DAYS.map((label, index) => {
      const day = byDay.get(index);
      const slots = (day?.slots ?? []).map((slot) => ({
        startMinute: slot.startMinute,
        endMinute: slot.endMinute,
        label: `${formatMinute(slot.startMinute)} - ${formatMinute(slot.endMinute)}`,
      }));
      return {
        dayLabel: label,
        date: day === undefined ? '' : day.date.toISOString(),
        available: slots.length > 0,
        slots,
      };
    });
  }
}

/** Index in the Mon..Sun week for a UTC date. */
function dayKey(date: Date): number {
  return (date.getUTCDay() + 6) % 7;
}

/** Format minutes from midnight as a 12 hour time, e.g. 480 -> 8:00 AM. */
function formatMinute(minute: number): string {
  const hour24 = Math.floor(minute / 60);
  const minutes = minute % 60;
  const period = hour24 < 12 ? 'AM' : 'PM';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12}:${String(minutes).padStart(2, '0')} ${period}`;
}

/** Whole years between a date of birth and now, or null when there is no date. */
function ageInYears(dateOfBirth: Date | null, now: Date): number | null {
  if (dateOfBirth === null) {
    return null;
  }
  let age = now.getUTCFullYear() - dateOfBirth.getUTCFullYear();
  const monthDelta = now.getUTCMonth() - dateOfBirth.getUTCMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getUTCDate() < dateOfBirth.getUTCDate())) {
    age -= 1;
  }
  return Math.max(0, age);
}
