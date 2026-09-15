import { Inject, Injectable } from '@nestjs/common';
import {
  CARE_RECIPIENT_REPOSITORY,
  CareRecipientRepository,
} from '@modules/care-recipients/domain/care-recipient.repository';
import { CareTeamAction } from '@modules/care-recipients/domain/care-team-action.enum';
import { CareTeamAssignmentEvent } from '@modules/care-recipients/domain/care-team-assignment-event.entity';
import {
  CARE_TEAM_ASSIGNMENT_EVENT_REPOSITORY,
  CareTeamAssignmentEventRepository,
} from '@modules/care-recipients/domain/care-team-assignment-event.repository';
import {
  CARE_TEAM_ASSIGNMENT_REPOSITORY,
  CareTeamAssignmentRepository,
} from '@modules/care-recipients/domain/care-team-assignment.repository';
import { CareRecipient } from '@modules/care-recipients/domain/care-recipient.entity';
import { DischargeAction } from '@modules/care-recipients/domain/discharge-action.enum';
import { DischargeRecord } from '@modules/care-recipients/domain/discharge-record.entity';
import {
  DISCHARGE_RECORD_REPOSITORY,
  DischargeRecordRepository,
} from '@modules/care-recipients/domain/discharge-record.repository';
import { VISIT_REPOSITORY, VisitRepository } from '@modules/visits/domain/visit.repository';
import { VisitStatus } from '@modules/visits/domain/visit-status.enum';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { DischargeFormCommand } from './save-discharge-draft.use-case';

export interface ProcessDischargeCommand extends DischargeFormCommand {
  adminId: string;
}

export interface ProcessDischargeResult {
  id: string;
  dischargeRecordId: string;
  status: string;
  cancelledVisits: number;
  removedAssignments: number;
}

const HISTORY_START = new Date(Date.UTC(2000, 0, 1));
const FUTURE_YEARS = 2;

/**
 * Use case: formally process the archive/discharge. Captures the discharge record
 * (validated: a discharge needs a reason, effective date, clinical summary and every
 * compliance acknowledgement), transitions the recipient (a reversible hold or a
 * discharge), and for a full discharge runs the cascade: cancel every future scheduled
 * visit and detach the active care team (recording the removal history). A hold pauses
 * care and preserves everything intact for a seamless reactivation.
 */
@Injectable()
export class ProcessDischargeUseCase {
  constructor(
    @Inject(CARE_RECIPIENT_REPOSITORY) private readonly recipients: CareRecipientRepository,
    @Inject(DISCHARGE_RECORD_REPOSITORY) private readonly records: DischargeRecordRepository,
    @Inject(VISIT_REPOSITORY) private readonly visits: VisitRepository,
    @Inject(CARE_TEAM_ASSIGNMENT_REPOSITORY)
    private readonly careTeam: CareTeamAssignmentRepository,
    @Inject(CARE_TEAM_ASSIGNMENT_EVENT_REPOSITORY)
    private readonly history: CareTeamAssignmentEventRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
  ) {}

  async execute(command: ProcessDischargeCommand): Promise<ProcessDischargeResult> {
    const recipient = await this.recipients.findById(command.recipientId);
    if (recipient === null) {
      throw new NotFoundDomainException('Care recipient not found');
    }

    const now = this.clock.now();
    const record = await this.upsertRecord(command, now);
    record.process(command.adminId, now);
    await this.records.save(record);

    if (command.action === DischargeAction.Hold) {
      recipient.placeOnHold(now);
      await this.recipients.save(recipient);
      return {
        id: recipient.id,
        dischargeRecordId: record.id,
        status: String(recipient.status),
        cancelledVisits: 0,
        removedAssignments: 0,
      };
    }

    recipient.discharge(now);
    const cancelledVisits = await this.cancelFutureVisits(command.recipientId, now);
    const removedAssignments = await this.detachCareTeam(recipient, command.adminId, now);
    await this.recipients.save(recipient);

    return {
      id: recipient.id,
      dischargeRecordId: record.id,
      status: String(recipient.status),
      cancelledVisits,
      removedAssignments,
    };
  }

  private async upsertRecord(
    command: ProcessDischargeCommand,
    now: Date,
  ): Promise<DischargeRecord> {
    const fields = {
      action: command.action,
      reason: command.reason,
      effectiveDate: command.effectiveDate,
      clinicalSummary: command.clinicalSummary,
      acknowledgements: command.acknowledgements,
    };
    const existing = await this.records.findByRecipient(command.recipientId);
    if (existing !== null) {
      existing.revise(fields, now);
      return existing;
    }
    const record = DischargeRecord.draft({
      id: this.ids.generate(),
      careRecipientId: command.recipientId,
      fields,
      now,
    });
    await this.records.add(record);
    return record;
  }

  private async cancelFutureVisits(recipientId: string, now: Date): Promise<number> {
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const futureEnd = new Date(Date.UTC(today.getUTCFullYear() + FUTURE_YEARS, 0, 1));
    const visits = await this.visits.listForCareRecipientsInRange(
      [recipientId],
      HISTORY_START,
      futureEnd,
    );
    let cancelled = 0;
    for (const visit of visits) {
      if (
        visit.status === VisitStatus.Scheduled &&
        visit.scheduledDate.getTime() >= today.getTime()
      ) {
        visit.cancel(now);
        await this.visits.save(visit);
        cancelled += 1;
      }
    }
    return cancelled;
  }

  private async detachCareTeam(
    recipient: CareRecipient,
    adminId: string,
    now: Date,
  ): Promise<number> {
    const active = await this.careTeam.listActiveForRecipient(recipient.id);
    for (const assignment of active) {
      assignment.remove(now);
      await this.careTeam.save(assignment);
      await this.history.add(
        CareTeamAssignmentEvent.record({
          id: this.ids.generate(),
          careRecipientId: recipient.id,
          caregiverId: assignment.caregiverId,
          action: CareTeamAction.Removed,
          reason: 'Care recipient discharged',
          byAdminId: adminId,
          now,
        }),
      );
    }
    if (recipient.primaryCaregiverId !== null) {
      recipient.unassignPrimaryCaregiver(now);
    }
    return active.length;
  }
}
