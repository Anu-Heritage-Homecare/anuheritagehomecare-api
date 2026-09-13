import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AdminAlertsModule } from '@modules/admin-alerts/admin-alerts.module';
import { AdminIdentityModule } from '@modules/admin-identity/admin-identity.module';
import { CareNotesModule } from '@modules/care-notes/care-notes.module';
import { CareRecipientsModule } from '@modules/care-recipients/care-recipients.module';
import { CertificationsModule } from '@modules/certifications/certifications.module';
import { IdentityModule } from '@modules/identity/identity.module';
import { RecipientBillingModule } from '@modules/recipient-billing/recipient-billing.module';
import { VisitsModule } from '@modules/visits/visits.module';
import { AcknowledgeCareNoteUseCase } from './application/use-cases/acknowledge-care-note.use-case';
import { AddCareNoteUseCase } from './application/use-cases/add-care-note.use-case';
import { AddCareRecipientUseCase } from './application/use-cases/add-care-recipient.use-case';
import { AddHealthEventUseCase } from './application/use-cases/add-health-event.use-case';
import { AddMedicationUseCase } from './application/use-cases/add-medication.use-case';
import { AddNoteCommentUseCase } from './application/use-cases/add-note-comment.use-case';
import { AssignCaregiverUseCase } from './application/use-cases/assign-caregiver.use-case';
import { ChangeCareRecipientStatusUseCase } from './application/use-cases/change-care-recipient-status.use-case';
import { CreateInvoiceUseCase } from './application/use-cases/create-invoice.use-case';
import { FlagCareNoteUseCase } from './application/use-cases/flag-care-note.use-case';
import { DeleteDocumentUseCase } from './application/use-cases/delete-document.use-case';
import { DiscontinueMedicationUseCase } from './application/use-cases/discontinue-medication.use-case';
import { RecordInvoicePaymentUseCase } from './application/use-cases/record-invoice-payment.use-case';
import { RemoveCaregiverUseCase } from './application/use-cases/remove-caregiver.use-case';
import { ReviseCaregiverAssignmentUseCase } from './application/use-cases/revise-caregiver-assignment.use-case';
import { SetBillingProfileUseCase } from './application/use-cases/set-billing-profile.use-case';
import { SetCoverageUseCase } from './application/use-cases/set-coverage.use-case';
import { GetCarePlanUseCase } from './application/use-cases/get-care-plan.use-case';
import { GetCareRecipientProfileUseCase } from './application/use-cases/get-care-recipient-profile.use-case';
import { GetRecipientBillingUseCase } from './application/use-cases/get-recipient-billing.use-case';
import { GetRecipientCaregiversUseCase } from './application/use-cases/get-recipient-caregivers.use-case';
import { GetRecipientDocumentsUseCase } from './application/use-cases/get-recipient-documents.use-case';
import { GetRecipientHealthUseCase } from './application/use-cases/get-recipient-health.use-case';
import { GetRecipientMedicationsUseCase } from './application/use-cases/get-recipient-medications.use-case';
import { GetRecipientNotesUseCase } from './application/use-cases/get-recipient-notes.use-case';
import { GetRecipientVisitsUseCase } from './application/use-cases/get-recipient-visits.use-case';
import { ListCareRecipientsUseCase } from './application/use-cases/list-care-recipients.use-case';
import { SetCarePlanGoalsUseCase } from './application/use-cases/set-care-plan-goals.use-case';
import { SetCarePlanInstructionsUseCase } from './application/use-cases/set-care-plan-instructions.use-case';
import { SetCarePlanScheduleUseCase } from './application/use-cases/set-care-plan-schedule.use-case';
import { SetCareRecipientPriorityUseCase } from './application/use-cases/set-care-recipient-priority.use-case';
import { SetDocumentStatusUseCase } from './application/use-cases/set-document-status.use-case';
import { SetMedicationWarningsUseCase } from './application/use-cases/set-medication-warnings.use-case';
import { UploadDocumentUseCase } from './application/use-cases/upload-document.use-case';
import { SetPrimaryCaregiverUseCase } from './application/use-cases/set-primary-caregiver.use-case';
import { UpdateMedicationUseCase } from './application/use-cases/update-medication.use-case';
import { CARE_ACTIVITY_DIRECTORY } from './application/ports/care-activity.port';
import { CARE_RECIPIENT_READ_MODEL } from './application/ports/care-recipient-read.port';
import { HEALTH_EVENT_READ_MODEL } from './application/ports/health-event-read.port';
import { MEDICATION_ADMINISTRATION_DIRECTORY } from './application/ports/medication-administration.port';
import { RECIPIENT_BILLING_READ_MODEL } from './application/ports/recipient-billing-read.port';
import { RECIPIENT_DOCUMENT_READ_MODEL } from './application/ports/recipient-document-read.port';
import { RECIPIENT_NOTES_READ_MODEL } from './application/ports/recipient-notes-read.port';
import { RECIPIENT_VISITS_READ_MODEL } from './application/ports/recipient-visits-read.port';
import { RECIPIENT_VITALS_DIRECTORY } from './application/ports/recipient-vitals.port';
import { VisitsCareActivityDirectory } from './infrastructure/access/visits-care-activity.directory';
import { VisitsMedicationAdministrationDirectory } from './infrastructure/access/visits-medication-administration.directory';
import { VisitsRecipientVitalsDirectory } from './infrastructure/access/visits-recipient-vitals.directory';
import { CareRecipientReadPrisma } from './infrastructure/persistence/care-recipient-read.prisma';
import { HealthEventReadPrisma } from './infrastructure/persistence/health-event-read.prisma';
import { RecipientBillingReadPrisma } from './infrastructure/persistence/recipient-billing-read.prisma';
import { RecipientDocumentReadPrisma } from './infrastructure/persistence/recipient-document-read.prisma';
import { RecipientNotesReadPrisma } from './infrastructure/persistence/recipient-notes-read.prisma';
import { RecipientVisitsReadPrisma } from './infrastructure/persistence/recipient-visits-read.prisma';
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
    CertificationsModule,
    RecipientBillingModule,
    CareNotesModule,
    AdminAlertsModule,
    AdminIdentityModule,
  ],
  controllers: [AdminCareRecipientsController],
  providers: [
    ListCareRecipientsUseCase,
    GetCareRecipientProfileUseCase,
    GetRecipientVisitsUseCase,
    GetRecipientMedicationsUseCase,
    GetRecipientHealthUseCase,
    GetRecipientCaregiversUseCase,
    GetRecipientDocumentsUseCase,
    GetRecipientBillingUseCase,
    GetRecipientNotesUseCase,
    AddCareNoteUseCase,
    AcknowledgeCareNoteUseCase,
    FlagCareNoteUseCase,
    AddNoteCommentUseCase,
    CreateInvoiceUseCase,
    RecordInvoicePaymentUseCase,
    SetBillingProfileUseCase,
    UploadDocumentUseCase,
    SetDocumentStatusUseCase,
    DeleteDocumentUseCase,
    AssignCaregiverUseCase,
    ReviseCaregiverAssignmentUseCase,
    RemoveCaregiverUseCase,
    SetCoverageUseCase,
    AddHealthEventUseCase,
    AddMedicationUseCase,
    UpdateMedicationUseCase,
    DiscontinueMedicationUseCase,
    SetMedicationWarningsUseCase,
    GetCarePlanUseCase,
    SetCarePlanGoalsUseCase,
    SetCarePlanScheduleUseCase,
    SetCarePlanInstructionsUseCase,
    AddCareRecipientUseCase,
    ChangeCareRecipientStatusUseCase,
    SetCareRecipientPriorityUseCase,
    SetPrimaryCaregiverUseCase,
    { provide: CARE_RECIPIENT_READ_MODEL, useClass: CareRecipientReadPrisma },
    { provide: RECIPIENT_VISITS_READ_MODEL, useClass: RecipientVisitsReadPrisma },
    {
      provide: MEDICATION_ADMINISTRATION_DIRECTORY,
      useClass: VisitsMedicationAdministrationDirectory,
    },
    { provide: RECIPIENT_VITALS_DIRECTORY, useClass: VisitsRecipientVitalsDirectory },
    { provide: HEALTH_EVENT_READ_MODEL, useClass: HealthEventReadPrisma },
    { provide: RECIPIENT_DOCUMENT_READ_MODEL, useClass: RecipientDocumentReadPrisma },
    { provide: RECIPIENT_BILLING_READ_MODEL, useClass: RecipientBillingReadPrisma },
    { provide: RECIPIENT_NOTES_READ_MODEL, useClass: RecipientNotesReadPrisma },
    { provide: CARE_ACTIVITY_DIRECTORY, useClass: VisitsCareActivityDirectory },
  ],
})
export class AdminCareRecipientsModule {}
