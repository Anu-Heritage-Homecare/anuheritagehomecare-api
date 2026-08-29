import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { CareRecipientsModule } from '@modules/care-recipients/care-recipients.module';
import { IdentityModule } from '@modules/identity/identity.module';
import { VisitsModule } from '@modules/visits/visits.module';
import {
  FAMILY_RECIPIENT_DIRECTORY,
  FAMILY_USER_DIRECTORY,
  FAMILY_VISIT_DIRECTORY,
} from './application/ports/family-dashboard-directories.port';
import { GetFamilyDashboardUseCase } from './application/use-cases/get-family-dashboard.use-case';
import { CareRecipientsFamilyRecipientDirectory } from './infrastructure/access/care-recipients-family-recipient-directory';
import { IdentityFamilyUserDirectory } from './infrastructure/access/identity-family-user-directory';
import { VisitsFamilyVisitDirectory } from './infrastructure/access/visits-family-visit-directory';
import { FamilyDashboardController } from './presentation/family-dashboard.controller';

/**
 * Family dashboard composition root. A read only context that composes the care
 * recipients, visits and identity contexts through local directory ports, each
 * bound to an adapter that delegates to the other context's exported repository.
 */
@Module({
  imports: [PassportModule, CareRecipientsModule, VisitsModule, IdentityModule],
  controllers: [FamilyDashboardController],
  providers: [
    GetFamilyDashboardUseCase,
    { provide: FAMILY_RECIPIENT_DIRECTORY, useClass: CareRecipientsFamilyRecipientDirectory },
    { provide: FAMILY_VISIT_DIRECTORY, useClass: VisitsFamilyVisitDirectory },
    { provide: FAMILY_USER_DIRECTORY, useClass: IdentityFamilyUserDirectory },
  ],
})
export class FamilyDashboardModule {}
