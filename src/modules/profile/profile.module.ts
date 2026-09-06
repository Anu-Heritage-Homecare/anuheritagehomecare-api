import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { BookingsModule } from '@modules/bookings/bookings.module';
import { CarePlansModule } from '@modules/care-plans/care-plans.module';
import { IdentityModule } from '@modules/identity/identity.module';
import { CARE_ACCESS } from './application/ports/care-access.port';
import {
  PROFILE_PLAN_DIRECTORY,
  PROFILE_USER_DIRECTORY,
} from './application/ports/profile-directories.port';
import { CareCircleAccessGuard } from './application/services/care-circle-access.guard';
import {
  GetCareCircleUseCase,
  GetCareCodeUseCase,
  RedeemCareCodeUseCase,
  RegenerateCareCodeUseCase,
  RemoveCareCircleMemberUseCase,
  SetCareCircleMemberAccessUseCase,
} from './application/use-cases/care-circle.use-cases';
import {
  GetEmergencyContactUseCase,
  SetEmergencyContactUseCase,
} from './application/use-cases/emergency-contact.use-cases';
import { GetPreferencesUseCase } from './application/use-cases/get-preferences.use-case';
import { GetProfileAccountUseCase } from './application/use-cases/get-profile-account.use-case';
import { UpdatePreferencesUseCase } from './application/use-cases/update-preferences.use-case';
import { CARE_CODE_REPOSITORY } from './domain/care-code.repository';
import { CARE_CIRCLE_REPOSITORY } from './domain/care-circle.repository';
import { EMERGENCY_CONTACT_REPOSITORY } from './domain/emergency-contact.repository';
import { PROFILE_PREFERENCES_REPOSITORY } from './domain/profile-preferences.repository';
import { BookingsProfilePlanDirectory } from './infrastructure/access/bookings-profile-plan-directory';
import { IdentityProfileUserDirectory } from './infrastructure/access/identity-profile-user-directory';
import { CareCodePrismaRepository } from './infrastructure/persistence/care-code-prisma.repository';
import { CareCirclePrismaRepository } from './infrastructure/persistence/care-circle-prisma.repository';
import { EmergencyContactPrismaRepository } from './infrastructure/persistence/emergency-contact-prisma.repository';
import { ProfilePreferencesPrismaRepository } from './infrastructure/persistence/profile-preferences-prisma.repository';
import { ProfileController } from './presentation/profile.controller';

/**
 * Family owner Profile context. It composes identity (name, role, avatar) and the
 * owner's active plan (bookings and the catalog) into the profile account card.
 * Photo delivery uses the global PhotoStorage port from the shared module.
 */
@Module({
  imports: [PassportModule, IdentityModule, BookingsModule, CarePlansModule],
  controllers: [ProfileController],
  providers: [
    GetProfileAccountUseCase,
    GetPreferencesUseCase,
    UpdatePreferencesUseCase,
    GetEmergencyContactUseCase,
    SetEmergencyContactUseCase,
    GetCareCircleUseCase,
    GetCareCodeUseCase,
    RegenerateCareCodeUseCase,
    RedeemCareCodeUseCase,
    SetCareCircleMemberAccessUseCase,
    RemoveCareCircleMemberUseCase,
    { provide: PROFILE_USER_DIRECTORY, useClass: IdentityProfileUserDirectory },
    { provide: PROFILE_PLAN_DIRECTORY, useClass: BookingsProfilePlanDirectory },
    { provide: PROFILE_PREFERENCES_REPOSITORY, useClass: ProfilePreferencesPrismaRepository },
    { provide: EMERGENCY_CONTACT_REPOSITORY, useClass: EmergencyContactPrismaRepository },
    { provide: CARE_CIRCLE_REPOSITORY, useClass: CareCirclePrismaRepository },
    { provide: CARE_CODE_REPOSITORY, useClass: CareCodePrismaRepository },
    { provide: CARE_ACCESS, useClass: CareCircleAccessGuard },
  ],
  exports: [CARE_ACCESS],
})
export class ProfileModule {}
