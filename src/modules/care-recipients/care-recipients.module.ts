import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { CreateCareRecipientDraftUseCase } from './application/use-cases/create-care-recipient-draft.use-case';
import { FinalizeCareRecipientUseCase } from './application/use-cases/finalize-care-recipient.use-case';
import { GetCareRecipientUseCase } from './application/use-cases/get-care-recipient.use-case';
import { ListCareRecipientsUseCase } from './application/use-cases/list-care-recipients.use-case';
import { UpdateCareNeedsUseCase } from './application/use-cases/update-care-needs.use-case';
import { UpdateCareScheduleUseCase } from './application/use-cases/update-care-schedule.use-case';
import { UpdateHealthInformationUseCase } from './application/use-cases/update-health-information.use-case';
import { CARE_RECIPIENT_REPOSITORY } from './domain/care-recipient.repository';
import { CareRecipientPrismaRepository } from './infrastructure/persistence/care-recipient-prisma.repository';
import { CareRecipientsController } from './presentation/care-recipients.controller';

/**
 * Care recipients bounded context composition root. The domain port is bound to
 * its Prisma adapter here, so every other layer depends only on the abstraction.
 * PassportModule is imported so the shared JwtAuthGuard can authenticate routes
 * using the access strategy the identity context registers.
 */
@Module({
  imports: [PassportModule],
  controllers: [CareRecipientsController],
  providers: [
    CreateCareRecipientDraftUseCase,
    UpdateCareNeedsUseCase,
    UpdateHealthInformationUseCase,
    UpdateCareScheduleUseCase,
    FinalizeCareRecipientUseCase,
    GetCareRecipientUseCase,
    ListCareRecipientsUseCase,
    { provide: CARE_RECIPIENT_REPOSITORY, useClass: CareRecipientPrismaRepository },
  ],
})
export class CareRecipientsModule {}
