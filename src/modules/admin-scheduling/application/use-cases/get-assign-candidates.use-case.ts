import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { SchedulingSettings } from '../../domain/scheduling-settings.entity';
import {
  SCHEDULING_SETTINGS_REPOSITORY,
  SchedulingSettingsRepository,
} from '../../domain/scheduling-settings.repository';
import {
  ASSIGN_CANDIDATE_READ_MODEL,
  AssignCandidateRaw,
  AssignCandidateReadModel,
  AssignVisitContext,
} from '../ports/assign-candidate-read.port';
import {
  AssignCandidateResult,
  AssignCandidatesResult,
  CandidateAvailabilityResult,
  CandidateEligibilityResult,
} from '../dto/assign-candidates.result';
import { requiredCertificationFor } from '../scheduling-rules.util';
import {
  displayPriority,
  displayService,
  formatMinute,
  startOfUtcDay,
} from '../scheduling-view.util';

const INACTIVE = new Set(['CANCELLED', 'MISSED']);
const KM_TO_MILES = 0.621371;
const MAX_LOAD = 8;

export interface GetAssignCandidatesCommand {
  visitId: string;
  search: string | null;
  branch: string | null;
  availableNow: boolean;
  sort: 'BEST_MATCH' | 'DISTANCE' | 'RATING';
}

/**
 * The Assign Caregiver screen: ranks every active caregiver for one unassigned
 * visit by a composite Best Match score (availability at the visit time, distance,
 * rating, certification match and the day's load), and reports each one's
 * eligibility (assignable, assignable with a warning, blocked by a time conflict,
 * or ineligible on an expired credential). Read only; all figures are derived.
 */
@Injectable()
export class GetAssignCandidatesUseCase {
  constructor(
    @Inject(ASSIGN_CANDIDATE_READ_MODEL) private readonly reads: AssignCandidateReadModel,
    @Inject(SCHEDULING_SETTINGS_REPOSITORY)
    private readonly settingsRepo: SchedulingSettingsRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: GetAssignCandidatesCommand): Promise<AssignCandidatesResult> {
    const context = await this.reads.matchContext(command.visitId);
    if (context === null) {
      throw new NotFoundDomainException('Visit not found');
    }
    const now = this.clock.now();
    const settings = (await this.settingsRepo.find()) ?? SchedulingSettings.createDefault(now);
    const visit = context.visit;
    const requiredCert = requiredCertificationFor(visit.serviceType);

    const scored = context.candidates.map((c) =>
      this.evaluate(c, visit, requiredCert, settings, now),
    );
    const filtered = scored.filter((c) => this.matchesFilters(c, command));
    const ranked = this.sort(filtered, command.sort);
    this.markBestMatch(ranked);

    return {
      visit: {
        id: visit.id,
        recipientName: visit.recipientName,
        serviceType: displayService(visit.serviceType),
        priority: displayPriority(visit.priority),
        date: startOfUtcDay(visit.scheduledDate).toISOString(),
        time: formatMinute(visit.startMinute),
        endTime: formatMinute(visit.endMinute),
        durationHours: round1((visit.endMinute - visit.startMinute) / 60),
        location: visit.location,
      },
      requiredCertification: requiredCert,
      total: ranked.length,
      candidates: ranked,
    };
  }

  private evaluate(
    candidate: AssignCandidateRaw,
    visit: AssignVisitContext,
    requiredCert: string | null,
    settings: SchedulingSettings,
    now: Date,
  ): AssignCandidateResult {
    const activeVisits = candidate.dayVisits.filter((v) => !INACTIVE.has(v.status));
    // Without back to back visits, a visit within the buffer also conflicts.
    const buffer = settings.travel.allowBackToBackVisits ? 0 : settings.travel.minBufferMinutes;
    const conflicts = activeVisits.filter(
      (v) => v.startMinute < visit.endMinute + buffer && visit.startMinute - buffer < v.endMinute,
    );
    const availability = this.availability(candidate, visit, conflicts, now);
    const eligibility = this.eligibility(
      candidate,
      requiredCert,
      conflicts.length > 0,
      settings,
      now,
    );

    const completed = candidate.dayVisits.filter((v) => v.status === 'COMPLETED').length;
    const total = activeVisits.length;
    const distanceMiles = this.distance(candidate, visit);
    const rating = candidate.ratingAverage === null ? null : round1(candidate.ratingAverage);

    return {
      caregiverId: candidate.caregiverId,
      name: candidate.name,
      title: candidate.title,
      branch: candidate.branch,
      bestMatch: false,
      matchScore: this.score(
        availability,
        eligibility,
        requiredCert,
        candidate,
        distanceMiles,
        total,
        settings,
        now,
      ),
      availability,
      distanceMiles,
      load: { completed, total, label: `${completed} of ${total} visits completed` },
      rating,
      certifications: candidate.certifications.map((c) => ({
        name: c.name,
        valid: c.expiresAt.getTime() > now.getTime(),
      })),
      skills: candidate.skills,
      eligibility,
    };
  }

  private availability(
    candidate: AssignCandidateRaw,
    visit: AssignVisitContext,
    conflicts: { endMinute: number }[],
    now: Date,
  ): CandidateAvailabilityResult {
    if (conflicts.length > 0) {
      const busyUntil = Math.max(...conflicts.map((c) => c.endMinute));
      return { status: 'BUSY', label: `Busy until ${formatMinute(busyUntil)}` };
    }
    if (candidate.availabilityWindows.length === 0) {
      return { status: 'OFF_DUTY', label: 'Off duty' };
    }
    const covered = candidate.availabilityWindows.some(
      (w) => w.startMinute <= visit.startMinute && w.endMinute >= visit.endMinute,
    );
    if (covered) {
      const isToday = startOfUtcDay(visit.scheduledDate).getTime() === startOfUtcDay(now).getTime();
      const nowMinute = now.getUTCHours() * 60 + now.getUTCMinutes();
      const label =
        isToday && visit.startMinute <= nowMinute
          ? 'Available now'
          : `Available from ${formatMinute(visit.startMinute)}`;
      return { status: 'AVAILABLE', label };
    }
    const later = candidate.availabilityWindows
      .map((w) => w.startMinute)
      .filter((start) => start > visit.startMinute)
      .sort((a, b) => a - b)[0];
    return {
      status: 'AVAILABLE_LATER',
      label:
        later === undefined
          ? 'Available later'
          : `Available from ${formatMinute(later)} (Available Later)`,
    };
  }

  private eligibility(
    candidate: AssignCandidateRaw,
    requiredCert: string | null,
    hasConflict: boolean,
    settings: SchedulingSettings,
    now: Date,
  ): CandidateEligibilityResult {
    if (hasConflict) {
      return {
        status: 'BLOCKED_CONFLICT',
        assignable: false,
        reason: 'Time conflict with current schedule',
      };
    }
    if (requiredCert !== null) {
      const matching = candidate.certifications.filter((c) =>
        c.name.toLowerCase().includes(requiredCert.toLowerCase()),
      );
      const hasValid = matching.some((c) => c.expiresAt.getTime() > now.getTime());
      if (matching.length > 0 && !hasValid) {
        return {
          status: 'INELIGIBLE',
          assignable: false,
          reason: `Expired credentials: ${requiredCert}`,
        };
      }
      if (matching.length === 0) {
        // With the certification match rule on, a missing cert blocks assignment.
        return settings.rules.requireCertificationMatch
          ? {
              status: 'INELIGIBLE',
              assignable: false,
              reason: `Missing required ${requiredCert} certification`,
            }
          : {
              status: 'WARN',
              assignable: true,
              reason: `No ${requiredCert} cert — action may require authorization`,
            };
      }
    }
    return { status: 'OK', assignable: true, reason: null };
  }

  private distance(candidate: AssignCandidateRaw, visit: AssignVisitContext): number | null {
    if (
      candidate.lastLatitude === null ||
      candidate.lastLongitude === null ||
      visit.recipientLatitude === null ||
      visit.recipientLongitude === null
    ) {
      return null;
    }
    const km = haversineKm(
      candidate.lastLatitude,
      candidate.lastLongitude,
      visit.recipientLatitude,
      visit.recipientLongitude,
    );
    return round1(km * KM_TO_MILES);
  }

  private score(
    availability: CandidateAvailabilityResult,
    eligibility: CandidateEligibilityResult,
    requiredCert: string | null,
    candidate: AssignCandidateRaw,
    distanceMiles: number | null,
    totalLoad: number,
    settings: SchedulingSettings,
    now: Date,
  ): number {
    if (!eligibility.assignable) {
      return 0;
    }
    const availabilityScore = { AVAILABLE: 1, AVAILABLE_LATER: 0.6, OFF_DUTY: 0.3, BUSY: 0 }[
      availability.status
    ];
    let certScore = 0.7;
    if (requiredCert !== null) {
      const matching = candidate.certifications.filter((c) =>
        c.name.toLowerCase().includes(requiredCert.toLowerCase()),
      );
      certScore = matching.some((c) => c.expiresAt.getTime() > now.getTime()) ? 1 : 0.4;
    }
    const ratingScore = candidate.ratingAverage === null ? 0.5 : candidate.ratingAverage / 5;
    const maxDistance = Math.max(1, settings.travel.maxTravelDistanceMiles);
    const distanceScore =
      distanceMiles === null
        ? 0.5
        : Math.max(0, 1 - Math.min(distanceMiles, maxDistance) / maxDistance);
    const loadScore = 1 - Math.min(totalLoad, MAX_LOAD) / MAX_LOAD;

    const weighted =
      availabilityScore * 0.3 +
      certScore * 0.25 +
      ratingScore * 0.2 +
      distanceScore * 0.15 +
      loadScore * 0.1;
    return Math.round(weighted * 100);
  }

  private matchesFilters(
    result: AssignCandidateResult,
    command: GetAssignCandidatesCommand,
  ): boolean {
    if (command.availableNow && result.availability.status !== 'AVAILABLE') {
      return false;
    }
    if (command.branch !== null && command.branch !== 'ALL' && result.branch !== command.branch) {
      return false;
    }
    if (command.search !== null && command.search.trim().length > 0) {
      const needle = command.search.trim().toLowerCase();
      const haystack = [
        result.name,
        result.title ?? '',
        ...result.skills,
        ...result.certifications.map((c) => c.name),
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(needle)) {
        return false;
      }
    }
    return true;
  }

  private sort(
    candidates: AssignCandidateResult[],
    sort: GetAssignCandidatesCommand['sort'],
  ): AssignCandidateResult[] {
    const byAssignable = (a: AssignCandidateResult, b: AssignCandidateResult): number =>
      Number(b.eligibility.assignable) - Number(a.eligibility.assignable);
    return [...candidates].sort((a, b) => {
      const assignable = byAssignable(a, b);
      if (assignable !== 0) {
        return assignable;
      }
      if (sort === 'DISTANCE') {
        return (a.distanceMiles ?? Infinity) - (b.distanceMiles ?? Infinity);
      }
      if (sort === 'RATING') {
        return (b.rating ?? -1) - (a.rating ?? -1);
      }
      return b.matchScore - a.matchScore;
    });
  }

  private markBestMatch(candidates: AssignCandidateResult[]): void {
    let best: AssignCandidateResult | null = null;
    for (const candidate of candidates) {
      if (
        candidate.eligibility.assignable &&
        (best === null || candidate.matchScore > best.matchScore)
      ) {
        best = candidate;
      }
    }
    if (best !== null) {
      best.bestMatch = true;
    }
  }
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number): number => (deg * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
