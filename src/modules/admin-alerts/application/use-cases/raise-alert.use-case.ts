import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import { AlertSeverity } from '../../domain/alert-severity.enum';
import { AlertType } from '../../domain/alert-type.enum';
import { OperationalAlert } from '../../domain/operational-alert.entity';
import {
  OPERATIONAL_ALERT_REPOSITORY,
  OperationalAlertRepository,
} from '../../domain/operational-alert.repository';
import { AlertResult, toAlertResult } from '../dto/alert.result';

export interface RaiseAlertCommand {
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  coordinatorName?: string | null;
  relatedVisitId?: string | null;
  relatedCaregiverId?: string | null;
  relatedCareRecipientId?: string | null;
}

/**
 * Use case: raise a new operational alert. Called by the operations subsystems
 * (for example the certification watch, or a medication discrepancy) to surface a
 * problem on the dashboard for a coordinator to action.
 */
@Injectable()
export class RaiseAlertUseCase {
  constructor(
    @Inject(OPERATIONAL_ALERT_REPOSITORY) private readonly alerts: OperationalAlertRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
  ) {}

  async execute(command: RaiseAlertCommand): Promise<AlertResult> {
    const alert = OperationalAlert.raise({
      id: this.ids.generate(),
      type: command.type,
      severity: command.severity,
      title: command.title,
      description: command.description,
      coordinatorName: command.coordinatorName,
      relatedVisitId: command.relatedVisitId,
      relatedCaregiverId: command.relatedCaregiverId,
      relatedCareRecipientId: command.relatedCareRecipientId,
      now: this.clock.now(),
    });
    await this.alerts.save(alert);
    return toAlertResult(alert);
  }
}
