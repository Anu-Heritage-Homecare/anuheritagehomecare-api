import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { CareRecipientsModule } from '@modules/care-recipients/care-recipients.module';
import { IdentityModule } from '@modules/identity/identity.module';
import { CARE_RECIPIENT_DIRECTORY } from './application/ports/care-recipient-directory.port';
import { OWNER_CONTACT_DIRECTORY } from './application/ports/owner-contact-directory.port';
import { ClockInVisitUseCase } from './application/use-cases/clock-in-visit.use-case';
import { ClockOutVisitUseCase } from './application/use-cases/clock-out-visit.use-case';
import { GetCaregiverScheduleUseCase } from './application/use-cases/get-caregiver-schedule.use-case';
import { GetVisitDetailUseCase } from './application/use-cases/get-visit-detail.use-case';
import { VISIT_REPOSITORY } from './domain/visit.repository';
import { IdentityOwnerContactDirectory } from './infrastructure/access/identity-owner-contact-directory';
import { PrismaCareRecipientDirectory } from './infrastructure/access/prisma-care-recipient-directory';
import { VisitPrismaRepository } from './infrastructure/persistence/visit-prisma.repository';
import { CaregiverScheduleController } from './presentation/caregiver-schedule.controller';
import { CaregiverVisitAttendanceController } from './presentation/caregiver-visit-attendance.controller';

/**
 * Visits bounded context composition root. The Visit repository is bound to its
 * Prisma adapter, and the two cross context reads (recipient details, family
 * owner as emergency contact) are bound to adapters that delegate to the care
 * recipients and identity contexts through their exported repository tokens.
 */
@Module({
  imports: [PassportModule, CareRecipientsModule, IdentityModule],
  controllers: [CaregiverScheduleController, CaregiverVisitAttendanceController],
  providers: [
    GetCaregiverScheduleUseCase,
    GetVisitDetailUseCase,
    ClockInVisitUseCase,
    ClockOutVisitUseCase,
    { provide: VISIT_REPOSITORY, useClass: VisitPrismaRepository },
    { provide: CARE_RECIPIENT_DIRECTORY, useClass: PrismaCareRecipientDirectory },
    { provide: OWNER_CONTACT_DIRECTORY, useClass: IdentityOwnerContactDirectory },
  ],
})
export class VisitsModule {}
