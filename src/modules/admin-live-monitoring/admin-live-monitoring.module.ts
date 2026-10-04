import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AdminAlertsModule } from '@modules/admin-alerts/admin-alerts.module';
import { VisitsModule } from '@modules/visits/visits.module';
import { LIVE_MONITORING_READ_MODEL } from './application/ports/live-monitoring-read.port';
import { DispatchSosUseCase } from './application/use-cases/dispatch-sos.use-case';
import { GetLiveOverviewUseCase } from './application/use-cases/get-live-overview.use-case';
import {
  AcknowledgeAlertUseCase,
  ResolveAlertUseCase,
} from './application/use-cases/manage-alert.use-case';
import {
  GetMapViewUseCase,
  ListActiveVisitsUseCase,
  ListAttentionUseCase,
} from './application/use-cases/live-monitoring-tabs.use-case';
import { SweepLiveAlertsUseCase } from './application/use-cases/sweep-live-alerts.use-case';
import { LiveMonitoringReadPrisma } from './infrastructure/persistence/live-monitoring-read.prisma';
import { AdminLiveMonitoringController } from './presentation/admin-live-monitoring.controller';

/**
 * Admin Live Monitoring. Composes the day's visits, active SOS alerts and caregiver
 * locations into the real time operations screen and drives the Emergency Dispatch
 * action. Separate admin auth applies at the controller. The SOS repository is
 * imported from the visits context.
 */
@Module({
  imports: [PassportModule, VisitsModule, AdminAlertsModule],
  controllers: [AdminLiveMonitoringController],
  providers: [
    GetLiveOverviewUseCase,
    ListActiveVisitsUseCase,
    ListAttentionUseCase,
    GetMapViewUseCase,
    DispatchSosUseCase,
    SweepLiveAlertsUseCase,
    AcknowledgeAlertUseCase,
    ResolveAlertUseCase,
    { provide: LIVE_MONITORING_READ_MODEL, useClass: LiveMonitoringReadPrisma },
  ],
})
export class AdminLiveMonitoringModule {}
