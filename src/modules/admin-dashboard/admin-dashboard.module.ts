import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AdminAlertsModule } from '@modules/admin-alerts/admin-alerts.module';
import { AdminTasksModule } from '@modules/admin-tasks/admin-tasks.module';
import { CareRatingsModule } from '@modules/care-ratings/care-ratings.module';
import { CareRecipientsModule } from '@modules/care-recipients/care-recipients.module';
import { CertificationsModule } from '@modules/certifications/certifications.module';
import { IdentityModule } from '@modules/identity/identity.module';
import { VisitsModule } from '@modules/visits/visits.module';
import { AssignCaregiverUseCase } from './application/use-cases/assign-caregiver.use-case';
import { GetAdminDashboardUseCase } from './application/use-cases/get-admin-dashboard.use-case';
import { AdminDashboardController } from './presentation/admin-dashboard.controller';

/**
 * Admin dashboard bounded context composition root. This is the read aggregator
 * for the operations home screen, so it imports the contexts it composes and
 * depends only on their exported repositories and use cases.
 */
@Module({
  imports: [
    PassportModule,
    VisitsModule,
    CareRecipientsModule,
    IdentityModule,
    AdminAlertsModule,
    AdminTasksModule,
    CareRatingsModule,
    CertificationsModule,
  ],
  controllers: [AdminDashboardController],
  providers: [GetAdminDashboardUseCase, AssignCaregiverUseCase],
})
export class AdminDashboardModule {}
