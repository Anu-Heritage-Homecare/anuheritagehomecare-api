import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { CareRecipientsModule } from '@modules/care-recipients/care-recipients.module';
import { IdentityModule } from '@modules/identity/identity.module';
import { VisitsModule } from '@modules/visits/visits.module';
import { SCHEDULING_READ_MODEL } from './application/ports/scheduling-read.port';
import { GetSchedulingConsoleUseCase } from './application/use-cases/get-scheduling-console.use-case';
import {
  AssignVisitCaregiverUseCase,
  CancelVisitUseCase,
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
 * (KPIs, table, unassigned, conflicts, calendar) and drives the schedule, assign,
 * reschedule and cancel operations over the visits context. Separate admin auth
 * applies at the controller.
 */
@Module({
  imports: [PassportModule, VisitsModule, CareRecipientsModule, IdentityModule],
  controllers: [AdminSchedulingController],
  providers: [
    GetSchedulingConsoleUseCase,
    ListUnassignedVisitsUseCase,
    GetSchedulingConflictsUseCase,
    GetSchedulingCalendarUseCase,
    ScheduleVisitUseCase,
    AssignVisitCaregiverUseCase,
    RescheduleVisitUseCase,
    CancelVisitUseCase,
    { provide: SCHEDULING_READ_MODEL, useClass: SchedulingReadPrisma },
  ],
})
export class AdminSchedulingModule {}
