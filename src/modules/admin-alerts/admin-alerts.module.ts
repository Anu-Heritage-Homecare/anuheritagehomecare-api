import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { VisitsModule } from '@modules/visits/visits.module';
import { ALERTS_ENRICHMENT_READ_MODEL } from './application/ports/alerts-enrichment-read.port';
import { EMERGENCY_ENRICHMENT_READ_MODEL } from './application/ports/emergency-enrichment-read.port';
import { INCIDENT_DETAIL_READ_MODEL } from './application/ports/incident-detail-read.port';
import { AcknowledgeEmergencyUseCase } from './application/use-cases/acknowledge-emergency.use-case';
import { AssignIncidentCoordinatorUseCase } from './application/use-cases/assign-incident-coordinator.use-case';
import { GetIncidentCommunicationsUseCase } from './application/use-cases/get-incident-communications.use-case';
import { GetIncidentDetailUseCase } from './application/use-cases/get-incident-detail.use-case';
import { GetIncidentResolutionUseCase } from './application/use-cases/get-incident-resolution.use-case';
import { GetIncidentTimelineUseCase } from './application/use-cases/get-incident-timeline.use-case';
import { LogIncidentTimelineEventUseCase } from './application/use-cases/log-incident-timeline-event.use-case';
import { ManageIncidentUseCase } from './application/use-cases/manage-incident.use-case';
import { RecordIncidentCommunicationUseCase } from './application/use-cases/record-incident-communication.use-case';
import { SaveIncidentResolutionUseCase } from './application/use-cases/save-incident-resolution.use-case';
import { GetAlertsOverviewUseCase } from './application/use-cases/get-alerts-overview.use-case';
import { GetEmergencyDetailUseCase } from './application/use-cases/get-emergency-detail.use-case';
import { GetResolvedOverviewUseCase } from './application/use-cases/get-resolved-overview.use-case';
import { ListIncidentsUseCase } from './application/use-cases/list-incidents.use-case';
import { ListOpenAlertsUseCase } from './application/use-cases/list-open-alerts.use-case';
import { LogResponseEventUseCase } from './application/use-cases/log-response-event.use-case';
import { ProgressAlertUseCase } from './application/use-cases/progress-alert.use-case';
import { RaiseAlertUseCase } from './application/use-cases/raise-alert.use-case';
import { ReportIncidentUseCase } from './application/use-cases/report-incident.use-case';
import { ResolveAlertUseCase } from './application/use-cases/resolve-alert.use-case';
import { ResolveEmergencyUseCase } from './application/use-cases/resolve-emergency.use-case';
import { ToggleProtocolStepUseCase } from './application/use-cases/toggle-protocol-step.use-case';
import { EMERGENCY_RESPONSE_REPOSITORY } from './domain/emergency-response.repository';
import { INCIDENT_COMMUNICATION_REPOSITORY } from './domain/incident-communication.repository';
import { INCIDENT_RESOLUTION_REPOSITORY } from './domain/incident-resolution.repository';
import { INCIDENT_REPOSITORY } from './domain/incident.repository';
import { INCIDENT_TIMELINE_REPOSITORY } from './domain/incident-timeline.repository';
import { OPERATIONAL_ALERT_REPOSITORY } from './domain/operational-alert.repository';
import { AlertsEnrichmentReadPrisma } from './infrastructure/persistence/alerts-enrichment-read.prisma';
import { EmergencyEnrichmentReadPrisma } from './infrastructure/persistence/emergency-enrichment-read.prisma';
import { EmergencyResponsePrismaRepository } from './infrastructure/persistence/emergency-response-prisma.repository';
import { IncidentDetailReadPrisma } from './infrastructure/persistence/incident-detail-read.prisma';
import { IncidentPrismaRepository } from './infrastructure/persistence/incident-prisma.repository';
import { IncidentCommunicationPrismaRepository } from './infrastructure/persistence/incident-communication-prisma.repository';
import { IncidentResolutionPrismaRepository } from './infrastructure/persistence/incident-resolution-prisma.repository';
import { IncidentTimelinePrismaRepository } from './infrastructure/persistence/incident-timeline-prisma.repository';
import { OperationalAlertPrismaRepository } from './infrastructure/persistence/operational-alert-prisma.repository';
import { AdminAlertsController } from './presentation/admin-alerts.controller';

/**
 * Admin alerts bounded context composition root. The repository is exported (with
 * the raise use case) so the dashboard can read open alerts and its derived
 * detectors can raise late caregiver and missed clock in alerts.
 */
@Module({
  imports: [PassportModule, VisitsModule],
  controllers: [AdminAlertsController],
  providers: [
    ListOpenAlertsUseCase,
    ResolveAlertUseCase,
    RaiseAlertUseCase,
    GetAlertsOverviewUseCase,
    ProgressAlertUseCase,
    ListIncidentsUseCase,
    ReportIncidentUseCase,
    GetEmergencyDetailUseCase,
    AcknowledgeEmergencyUseCase,
    ToggleProtocolStepUseCase,
    LogResponseEventUseCase,
    GetResolvedOverviewUseCase,
    ResolveEmergencyUseCase,
    GetIncidentDetailUseCase,
    ManageIncidentUseCase,
    AssignIncidentCoordinatorUseCase,
    GetIncidentTimelineUseCase,
    LogIncidentTimelineEventUseCase,
    GetIncidentCommunicationsUseCase,
    RecordIncidentCommunicationUseCase,
    GetIncidentResolutionUseCase,
    SaveIncidentResolutionUseCase,
    { provide: OPERATIONAL_ALERT_REPOSITORY, useClass: OperationalAlertPrismaRepository },
    { provide: INCIDENT_REPOSITORY, useClass: IncidentPrismaRepository },
    { provide: INCIDENT_TIMELINE_REPOSITORY, useClass: IncidentTimelinePrismaRepository },
    {
      provide: INCIDENT_COMMUNICATION_REPOSITORY,
      useClass: IncidentCommunicationPrismaRepository,
    },
    {
      provide: INCIDENT_RESOLUTION_REPOSITORY,
      useClass: IncidentResolutionPrismaRepository,
    },
    { provide: EMERGENCY_RESPONSE_REPOSITORY, useClass: EmergencyResponsePrismaRepository },
    { provide: ALERTS_ENRICHMENT_READ_MODEL, useClass: AlertsEnrichmentReadPrisma },
    { provide: EMERGENCY_ENRICHMENT_READ_MODEL, useClass: EmergencyEnrichmentReadPrisma },
    { provide: INCIDENT_DETAIL_READ_MODEL, useClass: IncidentDetailReadPrisma },
  ],
  exports: [OPERATIONAL_ALERT_REPOSITORY, RaiseAlertUseCase],
})
export class AdminAlertsModule {}
