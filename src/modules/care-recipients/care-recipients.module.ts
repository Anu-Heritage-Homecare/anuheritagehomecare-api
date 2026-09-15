import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { CreateCareRecipientDraftUseCase } from './application/use-cases/create-care-recipient-draft.use-case';
import { FinalizeCareRecipientUseCase } from './application/use-cases/finalize-care-recipient.use-case';
import { GetCareRecipientUseCase } from './application/use-cases/get-care-recipient.use-case';
import { ListCareRecipientsUseCase } from './application/use-cases/list-care-recipients.use-case';
import { UpdateCareNeedsUseCase } from './application/use-cases/update-care-needs.use-case';
import { UpdateCareScheduleUseCase } from './application/use-cases/update-care-schedule.use-case';
import { UpdateHealthInformationUseCase } from './application/use-cases/update-health-information.use-case';
import { SetCareGoalsUseCase } from './application/use-cases/set-care-goals.use-case';
import { CARE_GOAL_REPOSITORY } from './domain/care-goal.repository';
import { CARE_INSTRUCTION_REPOSITORY } from './domain/care-instruction.repository';
import { CARE_PLAN_REVISION_REPOSITORY } from './domain/care-plan-revision.repository';
import { CARE_PLAN_SCHEDULE_REPOSITORY } from './domain/care-plan-schedule-block.repository';
import { CARE_RECIPIENT_REPOSITORY } from './domain/care-recipient.repository';
import { CARE_TEAM_ASSIGNMENT_EVENT_REPOSITORY } from './domain/care-team-assignment-event.repository';
import { CARE_TEAM_ASSIGNMENT_REPOSITORY } from './domain/care-team-assignment.repository';
import { COVERAGE_BLOCK_REPOSITORY } from './domain/coverage-block.repository';
import { DISCHARGE_RECORD_REPOSITORY } from './domain/discharge-record.repository';
import { HEALTH_EVENT_REPOSITORY } from './domain/health-event.repository';
import { RECIPIENT_DOCUMENT_REPOSITORY } from './domain/recipient-document.repository';
import { MEDICATION_AUDIT_REPOSITORY } from './domain/medication-audit.repository';
import { MEDICATION_WARNING_REPOSITORY } from './domain/medication-warning.repository';
import { CareGoalPrismaRepository } from './infrastructure/persistence/care-goal-prisma.repository';
import { CareInstructionPrismaRepository } from './infrastructure/persistence/care-instruction-prisma.repository';
import { CarePlanRevisionPrismaRepository } from './infrastructure/persistence/care-plan-revision-prisma.repository';
import { CarePlanSchedulePrismaRepository } from './infrastructure/persistence/care-plan-schedule-prisma.repository';
import { CareRecipientPrismaRepository } from './infrastructure/persistence/care-recipient-prisma.repository';
import { CareTeamAssignmentEventPrismaRepository } from './infrastructure/persistence/care-team-assignment-event-prisma.repository';
import { CareTeamAssignmentPrismaRepository } from './infrastructure/persistence/care-team-assignment-prisma.repository';
import { CoverageBlockPrismaRepository } from './infrastructure/persistence/coverage-block-prisma.repository';
import { DischargeRecordPrismaRepository } from './infrastructure/persistence/discharge-record-prisma.repository';
import { HealthEventPrismaRepository } from './infrastructure/persistence/health-event-prisma.repository';
import { RecipientDocumentPrismaRepository } from './infrastructure/persistence/recipient-document-prisma.repository';
import { MedicationAuditPrismaRepository } from './infrastructure/persistence/medication-audit-prisma.repository';
import { MedicationWarningPrismaRepository } from './infrastructure/persistence/medication-warning-prisma.repository';
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
    SetCareGoalsUseCase,
    { provide: CARE_RECIPIENT_REPOSITORY, useClass: CareRecipientPrismaRepository },
    { provide: CARE_GOAL_REPOSITORY, useClass: CareGoalPrismaRepository },
    { provide: CARE_PLAN_SCHEDULE_REPOSITORY, useClass: CarePlanSchedulePrismaRepository },
    { provide: CARE_INSTRUCTION_REPOSITORY, useClass: CareInstructionPrismaRepository },
    { provide: CARE_PLAN_REVISION_REPOSITORY, useClass: CarePlanRevisionPrismaRepository },
    { provide: MEDICATION_WARNING_REPOSITORY, useClass: MedicationWarningPrismaRepository },
    { provide: MEDICATION_AUDIT_REPOSITORY, useClass: MedicationAuditPrismaRepository },
    { provide: HEALTH_EVENT_REPOSITORY, useClass: HealthEventPrismaRepository },
    { provide: CARE_TEAM_ASSIGNMENT_REPOSITORY, useClass: CareTeamAssignmentPrismaRepository },
    {
      provide: CARE_TEAM_ASSIGNMENT_EVENT_REPOSITORY,
      useClass: CareTeamAssignmentEventPrismaRepository,
    },
    { provide: COVERAGE_BLOCK_REPOSITORY, useClass: CoverageBlockPrismaRepository },
    { provide: RECIPIENT_DOCUMENT_REPOSITORY, useClass: RecipientDocumentPrismaRepository },
    { provide: DISCHARGE_RECORD_REPOSITORY, useClass: DischargeRecordPrismaRepository },
  ],
  exports: [
    CARE_RECIPIENT_REPOSITORY,
    CARE_GOAL_REPOSITORY,
    CARE_PLAN_SCHEDULE_REPOSITORY,
    CARE_INSTRUCTION_REPOSITORY,
    CARE_PLAN_REVISION_REPOSITORY,
    MEDICATION_WARNING_REPOSITORY,
    MEDICATION_AUDIT_REPOSITORY,
    HEALTH_EVENT_REPOSITORY,
    CARE_TEAM_ASSIGNMENT_REPOSITORY,
    CARE_TEAM_ASSIGNMENT_EVENT_REPOSITORY,
    COVERAGE_BLOCK_REPOSITORY,
    RECIPIENT_DOCUMENT_REPOSITORY,
    DISCHARGE_RECORD_REPOSITORY,
    SetCareGoalsUseCase,
  ],
})
export class CareRecipientsModule {}
