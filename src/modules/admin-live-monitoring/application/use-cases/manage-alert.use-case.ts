import { Inject, Injectable } from '@nestjs/common';
import {
  OPERATIONAL_ALERT_REPOSITORY,
  OperationalAlertRepository,
} from '@modules/admin-alerts/domain/operational-alert.repository';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';

/**
 * Acknowledge an operational alert (a coordinator has seen it and is handling it)
 * from the Live Monitoring Acknowledge Alert modal, capturing the acknowledging
 * coordinator and an optional note. The alert stays active (acknowledged, not closed).
 */
@Injectable()
export class AcknowledgeAlertUseCase {
  constructor(
    @Inject(OPERATIONAL_ALERT_REPOSITORY) private readonly alerts: OperationalAlertRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(alertId: string, adminId: string, note: string | null = null): Promise<void> {
    const alert = await this.alerts.findById(alertId);
    if (alert === null) {
      throw new NotFoundDomainException('Alert not found');
    }
    alert.acknowledge(adminId, note, this.clock.now());
    await this.alerts.save(alert);
  }
}

export interface ResolveAlertDetails {
  category?: string | null;
  actionTaken?: string | null;
  internalNote?: string | null;
}

/**
 * Resolve an operational alert (the problem has been actioned) from the Live
 * Monitoring Resolve Alert modal, capturing the resolution category, the action
 * taken and an optional internal note.
 */
@Injectable()
export class ResolveAlertUseCase {
  constructor(
    @Inject(OPERATIONAL_ALERT_REPOSITORY) private readonly alerts: OperationalAlertRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(
    alertId: string,
    adminId: string,
    details: ResolveAlertDetails = {},
  ): Promise<void> {
    const alert = await this.alerts.findById(alertId);
    if (alert === null) {
      throw new NotFoundDomainException('Alert not found');
    }
    alert.resolve(adminId, this.clock.now(), details);
    await this.alerts.save(alert);
  }
}

export interface EscalateAlertCommand {
  alertId: string;
  adminId: string;
  level: string;
  assignTo?: string | null;
  reason?: string | null;
  notes?: string | null;
}

/**
 * Escalate an operational alert from the Live Monitoring Escalate Issue modal: set
 * the escalation level, assignee, reason and note, moving the alert to Investigating.
 */
@Injectable()
export class EscalateAlertUseCase {
  constructor(
    @Inject(OPERATIONAL_ALERT_REPOSITORY) private readonly alerts: OperationalAlertRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: EscalateAlertCommand): Promise<void> {
    const alert = await this.alerts.findById(command.alertId);
    if (alert === null) {
      throw new NotFoundDomainException('Alert not found');
    }
    alert.escalate({
      adminId: command.adminId,
      level: command.level,
      assignee: command.assignTo ?? null,
      reason: command.reason ?? null,
      note: command.notes ?? null,
      now: this.clock.now(),
    });
    await this.alerts.save(alert);
  }
}
