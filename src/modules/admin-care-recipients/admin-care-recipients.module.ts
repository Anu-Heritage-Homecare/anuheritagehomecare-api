import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AdminAlertsModule } from '@modules/admin-alerts/admin-alerts.module';
import { AdminIdentityModule } from '@modules/admin-identity/admin-identity.module';
import { CareRecipientsModule } from '@modules/care-recipients/care-recipients.module';
import { IdentityModule } from '@modules/identity/identity.module';
import { VisitsModule } from '@modules/visits/visits.module';
import { AddCareRecipientUseCase } from './application/use-cases/add-care-recipient.use-case';
import { AddMedicationUseCase } from './application/use-cases/add-medication.use-case';
import { ChangeCareRecipientStatusUseCase } from './application/use-cases/change-care-recipient-status.use-case';
import { DiscontinueMedicationUseCase } from './application/use-cases/discontinue-medication.use-case';
import { GetCarePlanUseCase } from './application/use-cases/get-care-plan.use-case';
import { GetCareRecipientProfileUseCase } from './application/use-cases/get-care-recipient-profile.use-case';
import { GetRecipientHealthUseCase } from './application/use-cases/get-recipient-health.use-case';
import { GetRecipientMedicationsUseCase } from './application/use-cases/get-recipient-medications.use-case';
import { GetRecipientVisitsUseCase } from './application/use-cases/get-recipient-visits.use-case';
import { ListCareRecipientsUseCase } from './application/use-cases/list-care-recipients.use-case';
import { SetCarePlanGoalsUseCase } from './application/use-cases/set-care-plan-goals.use-case';
import { SetCarePlanInstructionsUseCase } from './application/use-cases/set-care-plan-instructions.use-case';
import { SetCarePlanScheduleUseCase } from './application/use-cases/set-care-plan-schedule.use-case';
import { SetCareRecipientPriorityUseCase } from './application/use-cases/set-care-recipient-priority.use-case';
import { SetMedicationWarningsUseCase } from './application/use-cases/set-medication-warnings.use-case';
import { SetPrimaryCaregiverUseCase } from './application/use-cases/set-primary-caregiver.use-case';
import { UpdateMedicationUseCase } from './application/use-cases/update-medication.use-case';
import { CARE_ACTIVITY_DIRECTORY } from './application/ports/care-activity.port';
import { CARE_RECIPIENT_READ_MODEL } from './application/ports/care-recipient-read.port';
import { HEALTH_EVENT_READ_MODEL } from './application/ports/health-event-read.port';
import { MEDICATION_ADMINISTRATION_DIRECTORY } from './application/ports/medication-administration.port';
import { RECIPIENT_VISITS_READ_MODEL } from './application/ports/recipient-visits-read.port';
import { RECIPIENT_VITALS_DIRECTORY } from './application/ports/recipient-vitals.port';
import { VisitsCareActivityDirectory } from './infrastructure/access/visits-care-activity.directory';
import { VisitsMedicationAdministrationDirectory } from './infrastructure/access/visits-medication-administration.directory';
import { VisitsRecipientVitalsDirectory } from './infrastructure/access/visits-recipient-vitals.directory';
import { CareRecipientReadPrisma } from './infrastructure/persistence/care-recipient-read.prisma';
import { HealthEventReadPrisma } from './infrastructure/persistence/health-event-read.prisma';
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
    { provide: CARE_ACTIVITY_DIRECTORY, useClass: VisitsCareActivityDirectory },
  ],
})
export class AdminCareRecipientsModule {}
