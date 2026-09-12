import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { IdentityModule } from '@modules/identity/identity.module';
import { ListCareRecipientsUseCase } from './application/use-cases/list-care-recipients.use-case';
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
  imports: [PassportModule, IdentityModule],
  controllers: [AdminCareRecipientsController],
  providers: [
    ListCareRecipientsUseCase,
    { provide: CARE_RECIPIENT_READ_MODEL, useClass: CareRecipientReadPrisma },
    { provide: CARE_ACTIVITY_DIRECTORY, useClass: VisitsCareActivityDirectory },
  ],
})
export class AdminCareRecipientsModule {}
