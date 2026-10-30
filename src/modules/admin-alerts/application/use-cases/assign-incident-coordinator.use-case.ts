import { Inject, Injectable } from '@nestjs/common';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { INCIDENT_REPOSITORY, IncidentRepository } from '../../domain/incident.repository';

export interface AssignIncidentCoordinatorCommand {
  incidentId: string;
  coordinatorAdminId: string;
}

/** Assign (or reassign) the coordinator handling an incident. */
@Injectable()
export class AssignIncidentCoordinatorUseCase {
  constructor(@Inject(INCIDENT_REPOSITORY) private readonly incidents: IncidentRepository) {}

  async execute(command: AssignIncidentCoordinatorCommand): Promise<void> {
    const incident = await this.incidents.findById(command.incidentId);
    if (incident === null) {
      throw new NotFoundDomainException('Incident not found');
    }
    incident.assignCoordinator(command.coordinatorAdminId);
    await this.incidents.save(incident);
  }
}
