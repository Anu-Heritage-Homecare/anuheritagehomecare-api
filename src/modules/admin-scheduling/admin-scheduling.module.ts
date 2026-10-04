import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { CaregiverProfileModule } from '@modules/caregiver-profile/caregiver-profile.module';
import { CareRatingsModule } from '@modules/care-ratings/care-ratings.module';
import { CareRecipientsModule } from '@modules/care-recipients/care-recipients.module';
import { CertificationsModule } from '@modules/certifications/certifications.module';
import { IdentityModule } from '@modules/identity/identity.module';
import { VisitsModule } from '@modules/visits/visits.module';
import { ASSIGN_CANDIDATE_READ_MODEL } from './application/ports/assign-candidate-read.port';
import { SCHEDULING_READ_MODEL } from './application/ports/scheduling-read.port';
import { SCHEDULING_SETTINGS_REPOSITORY } from './domain/scheduling-settings.repository';
import { GetAssignCandidatesUseCase } from './application/use-cases/get-assign-candidates.use-case';
import {
  AddHolidayUseCase,
  GetSchedulingSettingsUseCase,
  RemoveHolidayUseCase,
  UpdateSchedulingSettingsUseCase,
} from './application/use-cases/manage-scheduling-settings.use-case';
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
import { AssignCandidateReadPrisma } from './infrastructure/persistence/assign-candidate-read.prisma';
import { SchedulingReadPrisma } from './infrastructure/persistence/scheduling-read.prisma';
import { SchedulingSettingsPrismaRepository } from './infrastructure/persistence/scheduling-settings-prisma.repository';
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
    CertificationsModule,
  ],
  controllers: [AdminSchedulingController],
  providers: [
    GetSchedulingConsoleUseCase,
    ListUnassignedVisitsUseCase,
    GetSchedulingConflictsUseCase,
    GetSchedulingCalendarUseCase,
    GetVisitDetailsUseCase,
    GetAssignCandidatesUseCase,
    ScheduleVisitUseCase,
    AssignVisitCaregiverUseCase,
    RescheduleVisitUseCase,
    EditVisitUseCase,
    CancelVisitUseCase,
    GetSchedulingSettingsUseCase,
    UpdateSchedulingSettingsUseCase,
    AddHolidayUseCase,
    RemoveHolidayUseCase,
    { provide: SCHEDULING_READ_MODEL, useClass: SchedulingReadPrisma },
    { provide: ASSIGN_CANDIDATE_READ_MODEL, useClass: AssignCandidateReadPrisma },
    { provide: SCHEDULING_SETTINGS_REPOSITORY, useClass: SchedulingSettingsPrismaRepository },
  ],
})
export class AdminSchedulingModule {}
