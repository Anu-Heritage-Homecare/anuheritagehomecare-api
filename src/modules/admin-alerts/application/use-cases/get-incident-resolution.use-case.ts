import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
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

/** The Incident Detail Resolution tab: the resolution form and its derived fields. */
@Injectable()
export class GetIncidentResolutionUseCase {
  constructor(
    @Inject(INCIDENT_REPOSITORY) private readonly incidents: IncidentRepository,
    @Inject(INCIDENT_RESOLUTION_REPOSITORY)
    private readonly resolutions: IncidentResolutionRepository,
    @Inject(ALERTS_ENRICHMENT_READ_MODEL) private readonly reads: AlertsEnrichmentReadModel,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(incidentId: string): Promise<IncidentResolutionResult> {
    const incident = await this.incidents.findById(incidentId);
    if (incident === null) {
      throw new NotFoundDomainException('Incident not found');
    }
    const now = this.clock.now();

    const resolution =
      (await this.resolutions.findByIncident(incidentId)) ??
      IncidentResolution.start(this.ids.generate(), incidentId);

    const resolverId = incident.resolvedByAdminId;
    const resolverName =
      resolverId === null
        ? null
        : ((await this.reads.adminNames([resolverId])).get(resolverId) ?? null);

    return toResolutionResult(incident, resolution, resolverName, now);
  }
}
