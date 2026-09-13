import { Inject, Injectable } from '@nestjs/common';
import {
  ADMIN_USER_REPOSITORY,
  AdminUserRepository,
} from '@modules/admin-identity/domain/admin-user.repository';
import { Medication } from '@modules/care-recipients/domain/medication.entity';
import {
  CARE_RECIPIENT_REPOSITORY,
  CareRecipientRepository,
} from '@modules/care-recipients/domain/care-recipient.repository';
import {
  MEDICATION_AUDIT_REPOSITORY,
  MedicationAuditRepository,
} from '@modules/care-recipients/domain/medication-audit.repository';
import {
  MEDICATION_WARNING_REPOSITORY,
  MedicationWarningRepository,
} from '@modules/care-recipients/domain/medication-warning.repository';
import { USER_REPOSITORY, UserRepository } from '@modules/identity/domain/user.repository';
import { MedicationAdministrationOutcome } from '@modules/visits/domain/medication-administration-outcome.enum';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import {
  AdministrationView,
  MEDICATION_ADMINISTRATION_DIRECTORY,
  MedicationAdministrationDirectory,
  MedicationAdherenceCount,
} from '../ports/medication-administration.port';
import {
  MedicationsSummaryResult,
  NextDoseResult,
  PrescriptionResult,
  RecipientMedicationsResult,
  ScheduleDoseResult,
} from '../dto/recipient-medications.result';

const MS_PER_DAY = 86_400_000;
/** Window for the per medication adherence bars. */
const PER_MED_WINDOW_DAYS = 90;
/** Window for the overall adherence card and its month over month trend. */
const TREND_WINDOW_DAYS = 30;
/** How far back recent administrations are read, for last administered and today. */
const RECENT_ADMIN_DAYS = 60;
const RECENT_ADMIN_LIMIT = 500;
const AUDIT_LIMIT = 20;

const NOON = 12 * 60;
const EVENING = 17 * 60;

/**
 * Use case: assemble one recipient's Medications tab. Composes the recipient's
 * prescriptions (care recipients context), the office set clinical warnings and
 * prescription audit trail, and the administration records (visits context) to
 * compute adherence honestly from what was recorded. Derives the summary cards, the
 * per prescription adherence and last administered, today's dose schedule with its
 * administration status, and resolves caregiver and admin author names.
 */
@Injectable()
export class GetRecipientMedicationsUseCase {
  constructor(
    @Inject(CARE_RECIPIENT_REPOSITORY) private readonly recipients: CareRecipientRepository,
    @Inject(MEDICATION_WARNING_REPOSITORY) private readonly warnings: MedicationWarningRepository,
    @Inject(MEDICATION_AUDIT_REPOSITORY) private readonly audits: MedicationAuditRepository,
    @Inject(MEDICATION_ADMINISTRATION_DIRECTORY)
    private readonly administrations: MedicationAdministrationDirectory,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(ADMIN_USER_REPOSITORY) private readonly admins: AdminUserRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(recipientId: string): Promise<RecipientMedicationsResult> {
    const recipient = await this.recipients.findById(recipientId);
    if (recipient === null) {
      throw new NotFoundDomainException('Care recipient not found');
    }

    const now = this.clock.now();
    const today = startOfUtcDay(now);
    const trendFrom = new Date(today.getTime() - TREND_WINDOW_DAYS * MS_PER_DAY);
    const priorFrom = new Date(today.getTime() - 2 * TREND_WINDOW_DAYS * MS_PER_DAY);
    const perMedFrom = new Date(today.getTime() - PER_MED_WINDOW_DAYS * MS_PER_DAY);
    const recentFrom = new Date(today.getTime() - RECENT_ADMIN_DAYS * MS_PER_DAY);

    const [warnings, audits, perMedCounts, currentCounts, priorCounts, recent] = await Promise.all([
      this.warnings.listForRecipient(recipientId),
      this.audits.listForRecipient(recipientId, AUDIT_LIMIT),
      this.administrations.adherenceCounts(recipientId, perMedFrom, now),
      this.administrations.adherenceCounts(recipientId, trendFrom, now),
      this.administrations.adherenceCounts(recipientId, priorFrom, trendFrom),
      this.administrations.recentAdministrations(recipientId, recentFrom, RECENT_ADMIN_LIMIT),
    ]);

    const active = recipient.medications.filter((m) => m.isActive);
    const lastAdministered = this.lastAdministeredByMedication(recent);
    const missed = this.mostRecentMissedByMedication(recent);
    const administeredDosesToday = this.administeredDosesToday(recent, today, active);

    const caregiverIds = [
      ...new Set(
        [
          recipient.primaryCaregiverId,
          ...[...lastAdministered.values()].map((a) => a.caregiverId),
          ...[...administeredDosesToday.values()].map((a) => a.caregiverId),
        ].filter((id): id is string => id !== null && id !== undefined),
      ),
    ];
    const caregiverName = new Map(
      (await this.users.findByIds(caregiverIds)).map((u) => [u.id, u.name.fullName]),
    );
    const authorName = await this.resolveAuthors(audits.map((a) => a.authorAdminId));

    const primaryCaregiverName =
      recipient.primaryCaregiverId === null
        ? null
        : (caregiverName.get(recipient.primaryCaregiverId) ?? null);

    return {
      summary: this.buildSummary(active, warnings.length, warnings[0]?.title ?? null, {
        current: currentCounts,
        prior: priorCounts,
        now,
      }),
      prescriptions: this.buildPrescriptions(
        recipient.medications,
        perMedCounts,
        lastAdministered,
        missed,
        caregiverName,
      ),
      todaysSchedule: this.buildTodaysSchedule(
        active,
        administeredDosesToday,
        caregiverName,
        primaryCaregiverName,
      ),
      warnings: warnings.map((w) => ({ title: w.title, detail: w.detail })),
      audits: audits.map((a) => ({
        at: a.createdAt,
        title: a.title,
        detail: a.detail,
        authorName: a.authorAdminId === null ? null : (authorName.get(a.authorAdminId) ?? null),
      })),
    };
  }

  private buildSummary(
    active: Medication[],
    activeAlerts: number,
    alertSummary: string | null,
    adherence: {
      current: Map<string, MedicationAdherenceCount>;
      prior: Map<string, MedicationAdherenceCount>;
      now: Date;
    },
  ): MedicationsSummaryResult {
    const currentPct = overallPercent(adherence.current);
    const priorPct = overallPercent(adherence.prior);
    const trend =
      currentPct === null || priorPct === null ? null : Math.round(currentPct - priorPct);
    return {
      activeMedications: active.length,
      adherenceRatePercent: currentPct === null ? null : Math.round(currentPct),
      adherenceTrendPoints: trend,
      nextDose: this.nextDose(active, adherence.now),
      activeAlerts,
      alertSummary,
    };
  }

  private nextDose(active: Medication[], now: Date): NextDoseResult | null {
    const nowMinute = now.getUTCHours() * 60 + now.getUTCMinutes();
    const today = startOfUtcDay(now);
    const doses = active.flatMap((m) => m.doseTimes.map((minute) => ({ minute, med: m })));
    if (doses.length === 0) {
      return null;
    }
    const laterToday = doses
      .filter((d) => d.minute > nowMinute)
      .sort((a, b) => a.minute - b.minute);
    const pick =
      laterToday.length > 0 ? laterToday : [...doses].sort((a, b) => a.minute - b.minute);
    const minute = pick[0].minute;
    const dayOffset = laterToday.length > 0 ? 0 : 1;
    const at = new Date(today.getTime() + dayOffset * MS_PER_DAY + minute * 60_000);
    const dueMeds = pick.filter((d) => d.minute === minute).map((d) => medicationLabel(d.med));
    return { at, minute, label: dueMeds.join(', ') };
  }

  private buildPrescriptions(
    medications: Medication[],
    perMedCounts: Map<string, MedicationAdherenceCount>,
    lastAdministered: Map<string, { at: Date; caregiverId: string | null }>,
    missed: Map<string, AdministrationView>,
    caregiverName: Map<string, string>,
  ): PrescriptionResult[] {
    return [...medications]
      .sort((a, b) => this.sortKey(b) - this.sortKey(a))
      .map((med) => {
        const counts = perMedCounts.get(med.id);
        const last = lastAdministered.get(med.id) ?? null;
        const miss = missed.get(med.id) ?? null;
        return {
          id: med.id,
          name: med.name,
          dose: med.dose,
          purpose: med.purpose,
          status: String(med.status),
          scheduleLabel: scheduleLabel(med),
          prescribedBy: med.prescribedBy,
          startDate: med.startDate,
          adherencePercent:
            counts === undefined || counts.recorded === 0
              ? null
              : Math.round((counts.administered / counts.recorded) * 100),
          lastAdministered:
            last === null
              ? null
              : {
                  at: last.at,
                  caregiverName:
                    last.caregiverId === null
                      ? null
                      : (caregiverName.get(last.caregiverId) ?? null),
                },
          alert: miss === null ? null : `Missed dose ${monthDay(miss.recordedAt)}`,
        };
      });
  }

  private buildTodaysSchedule(
    active: Medication[],
    administeredDosesToday: Map<string, { caregiverId: string | null }>,
    caregiverName: Map<string, string>,
    primaryCaregiverName: string | null,
  ): ScheduleDoseResult[] {
    const byMinute = new Map<number, Medication[]>();
    for (const med of active) {
      for (const minute of med.doseTimes) {
        const list = byMinute.get(minute) ?? [];
        list.push(med);
        byMinute.set(minute, list);
      }
    }
    return [...byMinute.entries()]
      .sort(([a], [b]) => a - b)
      .map(([minute, meds]) => {
        const administeredRecords = meds
          .map((m) => administeredDosesToday.get(doseKey(m.id, minute)))
          .filter((a): a is { caregiverId: string | null } => a !== undefined);
        // The whole dose is administered only when every medication due at that
        // time has been recorded as administered.
        const administered = administeredRecords.length === meds.length;
        const administeredCaregiverId =
          administeredRecords.find((a) => a.caregiverId !== null)?.caregiverId ?? null;
        return {
          minute,
          timeLabel: timeLabel(minute),
          periodLabel: periodLabel(minute),
          medications: meds.map((m) => ({ name: m.name, dose: m.dose })),
          administered,
          caregiverName: administered
            ? administeredCaregiverId === null
              ? null
              : (caregiverName.get(administeredCaregiverId) ?? null)
            : primaryCaregiverName,
        };
      });
  }

  private lastAdministeredByMedication(
    recent: AdministrationView[],
  ): Map<string, { at: Date; caregiverId: string | null }> {
    const result = new Map<string, { at: Date; caregiverId: string | null }>();
    // `recent` is ordered most recent first, so the first hit per medication wins.
    for (const record of recent) {
      if (record.outcome !== MedicationAdministrationOutcome.Administered) {
        continue;
      }
      if (!result.has(record.medicationId)) {
        result.set(record.medicationId, { at: record.recordedAt, caregiverId: record.caregiverId });
      }
    }
    return result;
  }

  private mostRecentMissedByMedication(
    recent: AdministrationView[],
  ): Map<string, AdministrationView> {
    const result = new Map<string, AdministrationView>();
    for (const record of recent) {
      if (record.outcome === MedicationAdministrationOutcome.Administered) {
        continue;
      }
      if (!result.has(record.medicationId)) {
        result.set(record.medicationId, record);
      }
    }
    return result;
  }

  /**
   * Today's administered doses, keyed by medication and the scheduled dose time.
   * An administration does not record which scheduled time it was for, so each is
   * snapped to the medication's nearest dose time. This keeps a later dose of the
   * same medication showing as still due after an earlier dose was given.
   */
  private administeredDosesToday(
    recent: AdministrationView[],
    today: Date,
    active: Medication[],
  ): Map<string, { caregiverId: string | null }> {
    const doseTimesByMed = new Map(active.map((m) => [m.id, m.doseTimes]));
    const tomorrow = today.getTime() + MS_PER_DAY;
    const result = new Map<string, { caregiverId: string | null }>();
    for (const record of recent) {
      if (record.outcome !== MedicationAdministrationOutcome.Administered) {
        continue;
      }
      const at = record.recordedAt.getTime();
      if (at < today.getTime() || at >= tomorrow) {
        continue;
      }
      const doseTimes = doseTimesByMed.get(record.medicationId);
      if (doseTimes === undefined || doseTimes.length === 0) {
        continue;
      }
      const recordMinute = record.recordedAt.getUTCHours() * 60 + record.recordedAt.getUTCMinutes();
      const nearest = doseTimes.reduce((best, minute) =>
        Math.abs(minute - recordMinute) < Math.abs(best - recordMinute) ? minute : best,
      );
      const key = doseKey(record.medicationId, nearest);
      if (!result.has(key)) {
        result.set(key, { caregiverId: record.caregiverId });
      }
    }
    return result;
  }

  private async resolveAuthors(ids: (string | null)[]): Promise<Map<string, string>> {
    const unique = [...new Set(ids.filter((id): id is string => id !== null))];
    const result = new Map<string, string>();
    for (const id of unique) {
      const admin = await this.admins.findById(id);
      if (admin !== null) {
        result.set(id, admin.name.fullName);
      }
    }
    return result;
  }

  /** Sort key for the prescription list: newest start date first (created order as a fallback). */
  private sortKey(med: Medication): number {
    return med.startDate?.getTime() ?? 0;
  }
}

/** Composite key for a medication's dose at a given time of day. */
function doseKey(medicationId: string, minute: number): string {
  return `${medicationId}:${minute}`;
}

/** Midnight (UTC) of the day the given instant falls on. */
function startOfUtcDay(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

/** Overall administered / recorded across a counts map, as a percentage, or null. */
function overallPercent(counts: Map<string, MedicationAdherenceCount>): number | null {
  let administered = 0;
  let recorded = 0;
  for (const value of counts.values()) {
    administered += value.administered;
    recorded += value.recorded;
  }
  return recorded === 0 ? null : (administered / recorded) * 100;
}

/** For example "Donepezil (10mg)" or "Donepezil" when no dose is recorded. */
function medicationLabel(med: Medication): string {
  return med.dose === null ? med.name : `${med.name} (${med.dose})`;
}

/** A schedule label such as "Twice daily, Morning & Evening (with food)". */
function scheduleLabel(med: Medication): string {
  const times = med.doseTimes;
  const frequency = frequencyLabel(times.length);
  const periods = [...new Set(times.map((minute) => periodLabel(minute)))];
  const parts: string[] = [frequency];
  if (periods.length > 0) {
    parts.push(periods.join(' & '));
  }
  const base = parts.join(', ');
  return med.instructions === null ? base : `${base} (${med.instructions})`;
}

function frequencyLabel(count: number): string {
  switch (count) {
    case 0:
      return 'As needed';
    case 1:
      return 'Once daily';
    case 2:
      return 'Twice daily';
    case 3:
      return 'Three times daily';
    case 4:
      return 'Four times daily';
    default:
      return `${count} times daily`;
  }
}

function periodLabel(minute: number): string {
  if (minute < NOON) {
    return 'Morning';
  }
  if (minute < EVENING) {
    return 'Afternoon';
  }
  return 'Evening';
}

/** Format minutes from midnight as a 12 hour clock time, for example "8:00 AM". */
function timeLabel(minute: number): string {
  const hours24 = Math.floor(minute / 60);
  const minutes = minute % 60;
  const period = hours24 < 12 ? 'AM' : 'PM';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12}:${String(minutes).padStart(2, '0')} ${period}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Format a date as "Jul 22" in UTC. */
function monthDay(date: Date): string {
  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}`;
}
