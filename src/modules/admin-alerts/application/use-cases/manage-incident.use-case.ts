import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { INCIDENT_REPOSITORY, IncidentRepository } from '../../domain/incident.repository';
import { incidentStatusLabel } from '../incident-detail-presenter';

export type IncidentAction = 'REVIEW' | 'ESCALATE' | 'RESOLVE' | 'CLOSE';

export interface ManageIncidentCommand {
  incidentId: string;
  action: IncidentAction;
  adminId: string;
}

export interface IncidentActionResult {
  id: string;
  statusLabel: string;
}

/** Progress an incident: start review, escalate, resolve or close it. */
@Injectable()
export class ManageIncidentUseCase {
  constructor(
    @Inject(INCIDENT_REPOSITORY) private readonly incidents: IncidentRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: ManageIncidentCommand): Promise<IncidentActionResult> {
    const incident = await this.incidents.findById(command.incidentId);
    if (incident === null) {
      throw new NotFoundDomainException('Incident not found');
    }
    switch (command.action) {
      case 'REVIEW':
        incident.startReview(command.adminId);
        break;
      case 'ESCALATE':
        incident.escalate();
        break;
      case 'RESOLVE':
        incident.resolve(command.adminId, this.clock.now());
        break;
      case 'CLOSE':
        incident.closeOut(command.adminId, this.clock.now());
        break;
    }
    await this.incidents.save(incident);
    return { id: incident.id, statusLabel: incidentStatusLabel(incident.status) };
  }
}
