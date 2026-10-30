import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { INCIDENT_REPOSITORY, IncidentRepository } from '../../domain/incident.repository';
import { IncidentListResult } from '../dto/incident.result';
import { toIncidentRow } from '../incident-presenter';

const OVERVIEW_LIMIT = 200;

/**
 * The Incidents tab: the open incidents plus any resolved or closed today, most
 * recent first. Read only.
 */
@Injectable()
export class ListIncidentsUseCase {
  constructor(
    @Inject(INCIDENT_REPOSITORY) private readonly incidents: IncidentRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(): Promise<IncidentListResult> {
    const now = this.clock.now();
    const rows = await this.incidents.listForOverview(startOfUtcDay(now), OVERVIEW_LIMIT);
    return {
      generatedAt: now.toISOString(),
      items: rows.map((incident) => toIncidentRow(incident, now)),
    };
  }
}

function startOfUtcDay(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}
