import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { IncidentResolutionStatus } from '../../domain/incident-resolution-status.enum';
import { IncidentResolution } from '../../domain/incident-resolution.entity';
import {
  INCIDENT_RESOLUTION_REPOSITORY,
  IncidentResolutionRepository,
} from '../../domain/incident-resolution.repository';
import { INCIDENT_REPOSITORY, IncidentRepository } from '../../domain/incident.repository';
import {
  ALERTS_ENRICHMENT_READ_MODEL,
  AlertsEnrichmentReadModel,
} from '../ports/alerts-enrichment-read.port';
import { IncidentResolutionResult } from '../dto/incident-resolution.result';
import { toResolutionResult } from '../incident-resolution-presenter';

export interface SaveIncidentResolutionCommand {
  incidentId: string;
  status?: IncidentResolutionStatus;
  summary?: string | null;
  actionsTaken?: string | null;
  followUpRequired?: boolean;
  followUpDate?: Date | null;
  followUpNotes?: string | null;
  /** Save Resolution when false; Mark Resolved (also resolves the incident) when true. */
  markResolved: boolean;
  adminId: string;
}

/** Save an incident's resolution form, optionally marking the incident resolved. */
@Injectable()
export class SaveIncidentResolutionUseCase {
  constructor(
    @Inject(INCIDENT_REPOSITORY) private readonly incidents: IncidentRepository,
    @Inject(INCIDENT_RESOLUTION_REPOSITORY)
    private readonly resolutions: IncidentResolutionRepository,
    @Inject(ALERTS_ENRICHMENT_READ_MODEL) private readonly reads: AlertsEnrichmentReadModel,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: SaveIncidentResolutionCommand): Promise<IncidentResolutionResult> {
    const incident = await this.incidents.findById(command.incidentId);
    if (incident === null) {
      throw new NotFoundDomainException('Incident not found');
    }
    const now = this.clock.now();

    const resolution =
      (await this.resolutions.findByIncident(command.incidentId)) ??
      IncidentResolution.start(this.ids.generate(), command.incidentId);

    resolution.apply(
      {
        status: command.status,
        summary: command.summary,
        actionsTaken: command.actionsTaken,
        followUpRequired: command.followUpRequired,
        followUpDate: command.followUpDate,
        followUpNotes: command.followUpNotes,
      },
      command.adminId,
    );

    if (command.markResolved) {
      resolution.markResolved();
      incident.resolve(command.adminId, now);
      await this.incidents.save(incident);
    }
    await this.resolutions.save(resolution);

    const resolverId = incident.resolvedByAdminId;
    const resolverName =
      resolverId === null
        ? null
        : ((await this.reads.adminNames([resolverId])).get(resolverId) ?? null);

    return toResolutionResult(incident, resolution, resolverName, now);
  }
}
