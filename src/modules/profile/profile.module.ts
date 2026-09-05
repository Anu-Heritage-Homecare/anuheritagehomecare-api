import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { BookingsModule } from '@modules/bookings/bookings.module';
import { CarePlansModule } from '@modules/care-plans/care-plans.module';
import { IdentityModule } from '@modules/identity/identity.module';
import {
  PROFILE_PLAN_DIRECTORY,
  PROFILE_USER_DIRECTORY,
} from './application/ports/profile-directories.port';
import { GetProfileAccountUseCase } from './application/use-cases/get-profile-account.use-case';
import { BookingsProfilePlanDirectory } from './infrastructure/access/bookings-profile-plan-directory';
import { IdentityProfileUserDirectory } from './infrastructure/access/identity-profile-user-directory';
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
    { provide: PROFILE_USER_DIRECTORY, useClass: IdentityProfileUserDirectory },
    { provide: PROFILE_PLAN_DIRECTORY, useClass: BookingsProfilePlanDirectory },
  ],
})
export class ProfileModule {}
