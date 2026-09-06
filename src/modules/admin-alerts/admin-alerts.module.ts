import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { ListOpenAlertsUseCase } from './application/use-cases/list-open-alerts.use-case';
import { RaiseAlertUseCase } from './application/use-cases/raise-alert.use-case';
import { ResolveAlertUseCase } from './application/use-cases/resolve-alert.use-case';
import { OPERATIONAL_ALERT_REPOSITORY } from './domain/operational-alert.repository';
import { OperationalAlertPrismaRepository } from './infrastructure/persistence/operational-alert-prisma.repository';
import { AdminAlertsController } from './presentation/admin-alerts.controller';

/**
 * Admin alerts bounded context composition root. The repository is exported (with
 * the raise use case) so the dashboard can read open alerts and its derived
 * detectors can raise late caregiver and missed clock in alerts.
 */
@Module({
  imports: [PassportModule],
  controllers: [AdminAlertsController],
  providers: [
    ListOpenAlertsUseCase,
    ResolveAlertUseCase,
    RaiseAlertUseCase,
    { provide: OPERATIONAL_ALERT_REPOSITORY, useClass: OperationalAlertPrismaRepository },
  ],
  exports: [OPERATIONAL_ALERT_REPOSITORY, RaiseAlertUseCase],
})
export class AdminAlertsModule {}
