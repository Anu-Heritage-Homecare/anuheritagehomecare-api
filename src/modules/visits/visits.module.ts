import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { CareRecipientsModule } from '@modules/care-recipients/care-recipients.module';
import { IdentityModule } from '@modules/identity/identity.module';
import { CARE_RECIPIENT_DIRECTORY } from './application/ports/care-recipient-directory.port';
import { OWNER_CONTACT_DIRECTORY } from './application/ports/owner-contact-directory.port';
import { CancelSosUseCase } from './application/use-cases/cancel-sos.use-case';
import { ClockInVisitUseCase } from './application/use-cases/clock-in-visit.use-case';
import { ClockOutVisitUseCase } from './application/use-cases/clock-out-visit.use-case';
import { EndBreakUseCase } from './application/use-cases/end-break.use-case';
import { GetCaregiverScheduleUseCase } from './application/use-cases/get-caregiver-schedule.use-case';
import { GetVisitDetailUseCase } from './application/use-cases/get-visit-detail.use-case';
import { GetVisitReviewUseCase } from './application/use-cases/get-visit-review.use-case';
import { RaiseSosUseCase } from './application/use-cases/raise-sos.use-case';
import { RecordMedicationAdministrationUseCase } from './application/use-cases/record-medication-administration.use-case';
import { RecordObservationsUseCase } from './application/use-cases/record-observations.use-case';
import { RecordVitalsUseCase } from './application/use-cases/record-vitals.use-case';
import { AddVisitNoteUseCase } from './application/use-cases/add-visit-note.use-case';
import { CreatePhotoUploadTicketUseCase } from './application/use-cases/create-photo-upload-ticket.use-case';
import { SaveVisitPhotosUseCase } from './application/use-cases/save-visit-photos.use-case';
import { SetTaskCompletionUseCase } from './application/use-cases/set-task-completion.use-case';
import { StartTaskUseCase } from './application/use-cases/start-task.use-case';
import { StartBreakUseCase } from './application/use-cases/start-break.use-case';
import { SOS_ALERT_REPOSITORY } from './domain/sos-alert.repository';
import { VISIT_REPOSITORY } from './domain/visit.repository';
import { IdentityOwnerContactDirectory } from './infrastructure/access/identity-owner-contact-directory';
import { PrismaCareRecipientDirectory } from './infrastructure/access/prisma-care-recipient-directory';
import { SosAlertPrismaRepository } from './infrastructure/persistence/sos-alert-prisma.repository';
import { VisitPrismaRepository } from './infrastructure/persistence/visit-prisma.repository';
import { CaregiverScheduleController } from './presentation/caregiver-schedule.controller';
import { CaregiverSosController } from './presentation/caregiver-sos.controller';
import { CaregiverVisitAttendanceController } from './presentation/caregiver-visit-attendance.controller';
import { CaregiverVisitCareController } from './presentation/caregiver-visit-care.controller';

/**
 * Visits bounded context composition root. The Visit and SOS repositories are
 * bound to their Prisma adapters, and the two cross context reads (recipient
 * details, family owner as emergency contact) are bound to adapters that delegate
 * to the care recipients and identity contexts through their exported tokens.
 */
@Module({
  imports: [PassportModule, CareRecipientsModule, IdentityModule],
  controllers: [
    CaregiverScheduleController,
    CaregiverVisitAttendanceController,
    CaregiverVisitCareController,
    CaregiverSosController,
  ],
  providers: [
    GetCaregiverScheduleUseCase,
    GetVisitDetailUseCase,
    GetVisitReviewUseCase,
    ClockInVisitUseCase,
    ClockOutVisitUseCase,
    StartBreakUseCase,
    EndBreakUseCase,
    RecordMedicationAdministrationUseCase,
    RecordVitalsUseCase,
    RecordObservationsUseCase,
    AddVisitNoteUseCase,
    SaveVisitPhotosUseCase,
    CreatePhotoUploadTicketUseCase,
    SetTaskCompletionUseCase,
    StartTaskUseCase,
    RaiseSosUseCase,
    CancelSosUseCase,
    { provide: VISIT_REPOSITORY, useClass: VisitPrismaRepository },
    { provide: SOS_ALERT_REPOSITORY, useClass: SosAlertPrismaRepository },
    { provide: CARE_RECIPIENT_DIRECTORY, useClass: PrismaCareRecipientDirectory },
    { provide: OWNER_CONTACT_DIRECTORY, useClass: IdentityOwnerContactDirectory },
  ],
  // Exported so the earnings context can read a caregiver's visits through the
  // same repository port, projecting them into a timesheet.
  exports: [VISIT_REPOSITORY, SOS_ALERT_REPOSITORY],
})
export class VisitsModule {}
