import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AvailabilityModule } from '@modules/availability/availability.module';
import { CaregiverProfileModule } from '@modules/caregiver-profile/caregiver-profile.module';
import { CertificationsModule } from '@modules/certifications/certifications.module';
import { EarningsModule } from '@modules/earnings/earnings.module';
import { IdentityModule } from '@modules/identity/identity.module';
import { CAREGIVER_READ_MODEL } from './application/ports/caregiver-read.port';
import {
  AddCaregiverNoteUseCase,
  DeleteCaregiverUseCase,
  EditCaregiverUseCase,
} from './application/use-cases/edit-caregiver.use-case';
import { GetCaregiverOverviewUseCase } from './application/use-cases/get-caregiver-overview.use-case';
import { EditCaregiverPersonalInfoUseCase } from './application/use-cases/edit-caregiver-personal-info.use-case';
import { GetCaregiverScheduleUseCase } from './application/use-cases/get-caregiver-schedule.use-case';
import { ListCaregiversUseCase } from './application/use-cases/list-caregivers.use-case';
import {
  AddCertificationUseCase,
  EditCertificationUseCase,
  RemoveCertificationUseCase,
} from './application/use-cases/manage-certifications.use-case';
import { SetCaregiverAvailabilityUseCase } from './application/use-cases/set-caregiver-availability.use-case';
import { SetCaregiverHourlyRateUseCase } from './application/use-cases/set-caregiver-hourly-rate.use-case';
import { CaregiverReadPrisma } from './infrastructure/persistence/caregiver-read.prisma';
import { AdminCaregiversController } from './presentation/admin-caregivers.controller';

/**
 * Admin Caregivers panel. Reads the caregiver profile overlay and composes it with
 * the identity accounts, assignments, visits, ratings, certifications and
 * availability. Separate admin auth applies at the controller.
 */
@Module({
  imports: [
    PassportModule,
    CaregiverProfileModule,
    CertificationsModule,
    IdentityModule,
    EarningsModule,
    AvailabilityModule,
  ],
  controllers: [AdminCaregiversController],
  providers: [
    ListCaregiversUseCase,
    GetCaregiverOverviewUseCase,
    GetCaregiverScheduleUseCase,
    EditCaregiverUseCase,
    AddCaregiverNoteUseCase,
    DeleteCaregiverUseCase,
    AddCertificationUseCase,
    EditCertificationUseCase,
    RemoveCertificationUseCase,
    EditCaregiverPersonalInfoUseCase,
    SetCaregiverHourlyRateUseCase,
    SetCaregiverAvailabilityUseCase,
    { provide: CAREGIVER_READ_MODEL, useClass: CaregiverReadPrisma },
  ],
})
export class AdminCaregiversModule {}
