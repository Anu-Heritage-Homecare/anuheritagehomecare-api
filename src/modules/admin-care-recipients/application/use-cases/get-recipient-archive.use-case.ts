import { Inject, Injectable } from '@nestjs/common';
import { CareFrequency } from '@modules/care-recipients/domain/care-frequency.enum';
import { CareRecipient } from '@modules/care-recipients/domain/care-recipient.entity';
import {
  CARE_RECIPIENT_REPOSITORY,
  CareRecipientRepository,
} from '@modules/care-recipients/domain/care-recipient.repository';
import { CareRecipientStatus } from '@modules/care-recipients/domain/care-recipient-status.enum';
import {
  CARE_TEAM_ASSIGNMENT_REPOSITORY,
  CareTeamAssignmentRepository,
} from '@modules/care-recipients/domain/care-team-assignment.repository';
import { DischargeRecord } from '@modules/care-recipients/domain/discharge-record.entity';
import {
  DISCHARGE_RECORD_REPOSITORY,
  DischargeRecordRepository,
} from '@modules/care-recipients/domain/discharge-record.repository';
import { USER_REPOSITORY, UserRepository } from '@modules/identity/domain/user.repository';
import { VISIT_REPOSITORY, VisitRepository } from '@modules/visits/domain/visit.repository';
import { VisitStatus } from '@modules/visits/domain/visit-status.enum';
import { Currency, currencyForCountryCode } from '@shared/domain/currency.enum';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import {
  RECIPIENT_BILLING_READ_MODEL,
  RecipientBillingReadModel,
} from '../ports/recipient-billing-read.port';
import {
  DischargeChecklistItemResult,
  RecipientArchiveResult,
} from '../dto/recipient-archive.result';

const CARE_LEVEL: Record<CareFrequency, string> = {
  [CareFrequency.LiveInCare]: '24-Hour',
  [CareFrequency.Daily]: 'Full-Time',
  [CareFrequency.Weekly]: 'Part-Time',
  [CareFrequency.OneTimeVisit]: 'Hourly',
};

const HISTORY_START = new Date(Date.UTC(2000, 0, 1));
const FUTURE_YEARS = 2;
const DONE = 'DONE';
const PENDING = 'PENDING';
const NOT_STARTED = 'NOT_STARTED';

/**
 * Use case: assemble the Archive/Discharge screen. Composes the current service
 * summary (status, care duration, completed visits, plan, outstanding balance and
 * assigned caregivers) and the discharge readiness checklist, each item derived from
 * the recipient's real state, plus any saved discharge draft. Read only.
 */
@Injectable()
export class GetRecipientArchiveUseCase {
  constructor(
    @Inject(CARE_RECIPIENT_REPOSITORY) private readonly recipients: CareRecipientRepository,
    @Inject(VISIT_REPOSITORY) private readonly visits: VisitRepository,
    @Inject(CARE_TEAM_ASSIGNMENT_REPOSITORY)
    private readonly careTeam: CareTeamAssignmentRepository,
    @Inject(RECIPIENT_BILLING_READ_MODEL) private readonly billing: RecipientBillingReadModel,
    @Inject(DISCHARGE_RECORD_REPOSITORY) private readonly records: DischargeRecordRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(recipientId: string): Promise<RecipientArchiveResult> {
    const recipient = await this.recipients.findById(recipientId);
    if (recipient === null) {
      throw new NotFoundDomainException('Care recipient not found');
    }

    const now = this.clock.now();
    const today = startOfUtcDay(now);
    const futureEnd = new Date(Date.UTC(today.getUTCFullYear() + FUTURE_YEARS, 0, 1));
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const lastMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));

    const [visits, team, summary, draft, owner] = await Promise.all([
      this.visits.listForCareRecipientsInRange([recipientId], HISTORY_START, futureEnd),
      this.careTeam.listActiveForRecipient(recipientId),
      this.billing.summary(recipientId, monthStart, lastMonthStart, now),
      this.records.findByRecipient(recipientId),
      this.users.findById(recipient.ownerId),
    ]);

    const completed = visits.filter((v) => v.status === VisitStatus.Completed).length;
    const hasFutureShifts = visits.some(
      (v) => v.status === VisitStatus.Scheduled && v.scheduledDate.getTime() >= today.getTime(),
    );
    const currency = summary.currency ?? this.ownerCurrency(owner);
    const months = monthsBetween(recipient.completedAt, now);

    return {
      summary: {
        status: String(recipient.status),
        careDurationMonths: months,
        careDurationLabel: durationLabel(months),
        totalVisitsCompleted: completed,
        activePlan: recipient.schedule !== null,
        planLevel: recipient.schedule === null ? null : CARE_LEVEL[recipient.schedule.frequency],
        outstandingBalance:
          currency === null
            ? null
            : { amountMinor: summary.outstandingMinor, currency: String(currency) },
        assignedCaregivers: team.length,
      },
      checklist: this.buildChecklist(
        recipient,
        hasFutureShifts,
        summary.outstandingMinor,
        team.length,
      ),
      draft: draft === null ? null : this.toDraft(draft),
    };
  }

  private buildChecklist(
    recipient: CareRecipient,
    hasFutureShifts: boolean,
    outstandingMinor: number,
    activeTeam: number,
  ): DischargeChecklistItemResult[] {
    const discharged = recipient.status === CareRecipientStatus.Discharged;
    return [
      {
        key: 'SHIFTS_RECONCILED',
        label: 'Shifts Reconciled',
        detail: 'All future visits cancelled or completed',
        status: hasFutureShifts ? PENDING : DONE,
      },
      {
        key: 'CARE_PLAN_CLOSED',
        label: 'Care Plan Closed',
        detail: 'Clinical program archived',
        status: discharged ? DONE : PENDING,
      },
      {
        key: 'BILLING_RECONCILED',
        label: 'Billing Reconciled',
        detail: 'Balance confirmed',
        status: outstandingMinor === 0 ? DONE : PENDING,
      },
      {
        key: 'REMOVE_STAFF_ASSIGNMENTS',
        label: 'Remove Staff Assignments',
        detail: 'Pending final admin process',
        status: activeTeam === 0 ? DONE : PENDING,
      },
      // Family acknowledgment file upload and the discharge letter are process
      // artifacts whose capture surfaces are deferred, so they read as not started.
      {
        key: 'FAMILY_ACKNOWLEDGMENT',
        label: 'Family Acknowledgment',
        detail: 'Requires digital file upload',
        status: NOT_STARTED,
      },
      {
        key: 'GENERATE_DISCHARGE_LETTER',
        label: 'Generate Discharge Letter',
        detail: 'Drafting not started',
        status: NOT_STARTED,
      },
    ];
  }

  private toDraft(record: DischargeRecord): NonNullable<RecipientArchiveResult['draft']> {
    return {
      action: String(record.action),
      reason: record.reason === null ? null : String(record.reason),
      effectiveDate: record.effectiveDate,
      clinicalSummary: record.clinicalSummary,
      acknowledgements: record.acknowledgements.map((ack) => String(ack)),
      status: String(record.status),
      processedAt: record.processedAt,
    };
  }

  private ownerCurrency(owner: { address: { country: unknown } } | null): Currency | null {
    if (owner === null) {
      return null;
    }
    try {
      return currencyForCountryCode(String(owner.address.country));
    } catch {
      return null;
    }
  }
}

/** Midnight (UTC) of the day the given instant falls on. */
function startOfUtcDay(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

/** Whole months between a start date and now, or 0 when there is no start. */
function monthsBetween(start: Date | null, now: Date): number {
  if (start === null) {
    return 0;
  }
  let months =
    (now.getUTCFullYear() - start.getUTCFullYear()) * 12 +
    (now.getUTCMonth() - start.getUTCMonth());
  if (now.getUTCDate() < start.getUTCDate()) {
    months -= 1;
  }
  return Math.max(0, months);
}

/** Format a month count as "1 yr, 7 month" (or "7 month" under a year). */
function durationLabel(months: number): string {
  const years = Math.floor(months / 12);
  const remainder = months % 12;
  if (years === 0) {
    return `${remainder} month`;
  }
  return `${years} yr, ${remainder} month`;
}
