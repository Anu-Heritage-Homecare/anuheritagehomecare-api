import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { BookingsModule } from '@modules/bookings/bookings.module';
import { CareRecipientsModule } from '@modules/care-recipients/care-recipients.module';
import { IdentityModule } from '@modules/identity/identity.module';
import { VisitsModule } from '@modules/visits/visits.module';
import { FAMILY_PLAN_DIRECTORY } from './application/ports/family-plan-directory.port';
import { DownloadVisitPhotosUseCase } from './application/use-cases/download-visit-photos.use-case';
import { GetCareOverviewUseCase } from './application/use-cases/get-care-overview.use-case';
import { GetCarePlanUseCase } from './application/use-cases/get-care-plan.use-case';
import { GetFamilyVisitDetailUseCase } from './application/use-cases/get-family-visit-detail.use-case';
import { GetRecipientHealthUseCase } from './application/use-cases/get-recipient-health.use-case';
import { GetRecipientVisitsUseCase } from './application/use-cases/get-recipient-visits.use-case';
import { ReviseCareScheduleUseCase } from './application/use-cases/revise-care-schedule.use-case';
import { BookingsFamilyPlanDirectory } from './infrastructure/access/bookings-family-plan-directory';
import { FamilyCareController } from './presentation/family-care.controller';

/**
 * Family Care section read module. A read only context that composes the visits,
 * care recipients, identity and bookings contexts (through their exported
 * repositories) into the owner facing Care views. Every read is scoped to the
 * owner.
 */
@Module({
  imports: [PassportModule, VisitsModule, CareRecipientsModule, IdentityModule, BookingsModule],
  controllers: [FamilyCareController],
  providers: [
    GetCareOverviewUseCase,
    GetRecipientHealthUseCase,
    GetCarePlanUseCase,
    GetRecipientVisitsUseCase,
    GetFamilyVisitDetailUseCase,
    DownloadVisitPhotosUseCase,
    ReviseCareScheduleUseCase,
    { provide: FAMILY_PLAN_DIRECTORY, useClass: BookingsFamilyPlanDirectory },
  ],
})
export class FamilyCareModule {}
