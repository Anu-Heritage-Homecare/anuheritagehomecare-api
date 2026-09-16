import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { CareRecipientsModule } from '@modules/care-recipients/care-recipients.module';
import { CARE_RECIPIENT_OWNER_DIRECTORY } from './application/ports/care-recipient-owner-directory.port';
import { SubmitAdditionalCareRequestUseCase } from './application/use-cases/submit-additional-care-request.use-case';
import { ADDITIONAL_CARE_REQUEST_REPOSITORY } from './domain/additional-care-request.repository';
import { CareRecipientsOwnerDirectory } from './infrastructure/access/care-recipients-owner-directory';
import { AdditionalCareRequestPrismaRepository } from './infrastructure/persistence/additional-care-request-prisma.repository';
import { CareRequestsController } from './presentation/care-requests.controller';

/**
 * Care requests bounded context. The family owner requests additional care for a
 * recipient they own; ownership is verified through the care recipients context.
 */
@Module({
  imports: [PassportModule, CareRecipientsModule],
  controllers: [CareRequestsController],
  providers: [
    SubmitAdditionalCareRequestUseCase,
    {
      provide: ADDITIONAL_CARE_REQUEST_REPOSITORY,
      useClass: AdditionalCareRequestPrismaRepository,
    },
    { provide: CARE_RECIPIENT_OWNER_DIRECTORY, useClass: CareRecipientsOwnerDirectory },
  ],
  exports: [ADDITIONAL_CARE_REQUEST_REPOSITORY],
})
export class CareRequestsModule {}
