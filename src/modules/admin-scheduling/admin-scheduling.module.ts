import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { CaregiverProfileModule } from '@modules/caregiver-profile/caregiver-profile.module';
import { CareRatingsModule } from '@modules/care-ratings/care-ratings.module';
import { CareRecipientsModule } from '@modules/care-recipients/care-recipients.module';
import { IdentityModule } from '@modules/identity/identity.module';
import { VisitsModule } from '@modules/visits/visits.module';
import { SCHEDULING_READ_MODEL } from './application/ports/scheduling-read.port';
import { GetSchedulingConsoleUseCase } from './application/use-cases/get-scheduling-console.use-case';
import { GetVisitDetailsUseCase } from './application/use-cases/get-visit-details.use-case';
import {
  AssignVisitCaregiverUseCase,
  CancelVisitUseCase,
  EditVisitUseCase,
  RescheduleVisitUseCase,
  ScheduleVisitUseCase,
} from './application/use-cases/manage-visits.use-case';
import {
  GetSchedulingCalendarUseCase,
  GetSchedulingConflictsUseCase,
  ListUnassignedVisitsUseCase,
} from './application/use-cases/scheduling-tabs.use-case';
import { SchedulingReadPrisma } from './infrastructure/persistence/scheduling-read.prisma';
import { AdminSchedulingController } from './presentation/admin-scheduling.controller';

/**
 * Admin Scheduling console. Composes the org's visits into the operations screen
 * (KPIs, table, unassigned, conflicts, calendar), the Visit Details screen, and
 * drives the schedule, assign, reschedule, edit and cancel operations over the
 * visits context. Separate admin auth applies at the controller.
 */
@Module({
  imports: [
    PassportModule,
    VisitsModule,
    CareRecipientsModule,
    IdentityModule,
    CaregiverProfileModule,
    CareRatingsModule,
  ],
  controllers: [AdminSchedulingController],
  providers: [
    GetSchedulingConsoleUseCase,
    ListUnassignedVisitsUseCase,
    GetSchedulingConflictsUseCase,
    GetSchedulingCalendarUseCase,
    GetVisitDetailsUseCase,
    ScheduleVisitUseCase,
    AssignVisitCaregiverUseCase,
    RescheduleVisitUseCase,
    EditVisitUseCase,
    CancelVisitUseCase,
    { provide: SCHEDULING_READ_MODEL, useClass: SchedulingReadPrisma },
  ],
})
export class AdminSchedulingModule {}
