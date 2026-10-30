import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { CommunicationChannel } from '../../domain/communication-channel.enum';
import { CommunicationOutcome } from '../../domain/communication-outcome.enum';
import { IncidentCommunication } from '../../domain/incident-communication.entity';
import {
  INCIDENT_COMMUNICATION_REPOSITORY,
  IncidentCommunicationRepository,
} from '../../domain/incident-communication.repository';
import { INCIDENT_REPOSITORY, IncidentRepository } from '../../domain/incident.repository';

export interface RecordIncidentCommunicationCommand {
  incidentId: string;
  channel: CommunicationChannel;
  outcome: CommunicationOutcome;
  contactName: string;
  contactRole?: string | null;
  notes?: string | null;
  adminId: string;
}

/** Record (document) a communication regarding an incident. */
@Injectable()
export class RecordIncidentCommunicationUseCase {
  constructor(
    @Inject(INCIDENT_REPOSITORY) private readonly incidents: IncidentRepository,
    @Inject(INCIDENT_COMMUNICATION_REPOSITORY)
    private readonly communications: IncidentCommunicationRepository,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: RecordIncidentCommunicationCommand): Promise<void> {
    const incident = await this.incidents.findById(command.incidentId);
    if (incident === null) {
      throw new NotFoundDomainException('Incident not found');
    }
    await this.communications.record(
      IncidentCommunication.record({
        id: this.ids.generate(),
        incidentId: command.incidentId,
        channel: command.channel,
        outcome: command.outcome,
        contactName: command.contactName,
        contactRole: command.contactRole,
        notes: command.notes,
        authorAdminId: command.adminId,
        now: this.clock.now(),
      }),
    );
  }
}
