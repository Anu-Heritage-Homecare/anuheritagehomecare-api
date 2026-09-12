import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AdminAlertsModule } from '@modules/admin-alerts/admin-alerts.module';
import { AdminIdentityModule } from '@modules/admin-identity/admin-identity.module';
import { CareRecipientsModule } from '@modules/care-recipients/care-recipients.module';
import { IdentityModule } from '@modules/identity/identity.module';
import { VisitsModule } from '@modules/visits/visits.module';
import { AddCareRecipientUseCase } from './application/use-cases/add-care-recipient.use-case';
import { ChangeCareRecipientStatusUseCase } from './application/use-cases/change-care-recipient-status.use-case';
import { GetCarePlanUseCase } from './application/use-cases/get-care-plan.use-case';
import { GetCareRecipientProfileUseCase } from './application/use-cases/get-care-recipient-profile.use-case';
import { ListCareRecipientsUseCase } from './application/use-cases/list-care-recipients.use-case';
import { SetCareRecipientPriorityUseCase } from './application/use-cases/set-care-recipient-priority.use-case';
import { SetPrimaryCaregiverUseCase } from './application/use-cases/set-primary-caregiver.use-case';
import { CARE_ACTIVITY_DIRECTORY } from './application/ports/care-activity.port';
import { CARE_RECIPIENT_READ_MODEL } from './application/ports/care-recipient-read.port';
import { VisitsCareActivityDirectory } from './infrastructure/access/visits-care-activity.directory';
import { CareRecipientReadPrisma } from './infrastructure/persistence/care-recipient-read.prisma';
import { AdminCareRecipientsController } from './presentation/admin-care-recipients.controller';

/**
 * Admin care recipients bounded context composition root. A read model for the
 * admin roster screen: the list query and counts come from a dedicated Prisma
 * read model, caregiver names from the identity context, and last visit and
 * overdue counts from the visits context.
 */
@Module({
  imports: [
    PassportModule,
    IdentityModule,
    CareRecipientsModule,
    VisitsModule,
    AdminAlertsModule,
    AdminIdentityModule,
  ],
  controllers: [AdminCareRecipientsController],
  providers: [
    ListCareRecipientsUseCase,
    GetCareRecipientProfileUseCase,
    GetCarePlanUseCase,
    AddCareRecipientUseCase,
    ChangeCareRecipientStatusUseCase,
    SetCareRecipientPriorityUseCase,
    SetPrimaryCaregiverUseCase,
    { provide: CARE_RECIPIENT_READ_MODEL, useClass: CareRecipientReadPrisma },
    { provide: CARE_ACTIVITY_DIRECTORY, useClass: VisitsCareActivityDirectory },
  ],
})
export class AdminCareRecipientsModule {}
