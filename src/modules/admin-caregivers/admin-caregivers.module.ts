import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { CaregiverProfileModule } from '@modules/caregiver-profile/caregiver-profile.module';
import { CAREGIVER_READ_MODEL } from './application/ports/caregiver-read.port';
import {
  AddCaregiverNoteUseCase,
  DeleteCaregiverUseCase,
  EditCaregiverUseCase,
} from './application/use-cases/edit-caregiver.use-case';
import { GetCaregiverOverviewUseCase } from './application/use-cases/get-caregiver-overview.use-case';
import { GetCaregiverScheduleUseCase } from './application/use-cases/get-caregiver-schedule.use-case';
import { ListCaregiversUseCase } from './application/use-cases/list-caregivers.use-case';
import { CaregiverReadPrisma } from './infrastructure/persistence/caregiver-read.prisma';
import { AdminCaregiversController } from './presentation/admin-caregivers.controller';

/**
 * Admin Caregivers panel. Reads the caregiver profile overlay and composes it with
 * the identity accounts, assignments, visits, ratings, certifications and
 * availability. Separate admin auth applies at the controller.
 */
@Module({
  imports: [PassportModule, CaregiverProfileModule],
  controllers: [AdminCaregiversController],
  providers: [
    ListCaregiversUseCase,
    GetCaregiverOverviewUseCase,
    GetCaregiverScheduleUseCase,
    EditCaregiverUseCase,
    AddCaregiverNoteUseCase,
    DeleteCaregiverUseCase,
    { provide: CAREGIVER_READ_MODEL, useClass: CaregiverReadPrisma },
  ],
})
export class AdminCaregiversModule {}
