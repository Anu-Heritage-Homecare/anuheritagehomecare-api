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
import { CareGoalPrismaRepository } from './infrastructure/persistence/care-goal-prisma.repository';
import { CareInstructionPrismaRepository } from './infrastructure/persistence/care-instruction-prisma.repository';
import { CarePlanRevisionPrismaRepository } from './infrastructure/persistence/care-plan-revision-prisma.repository';
import { CarePlanSchedulePrismaRepository } from './infrastructure/persistence/care-plan-schedule-prisma.repository';
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
    SetCareGoalsUseCase,
    { provide: CARE_RECIPIENT_REPOSITORY, useClass: CareRecipientPrismaRepository },
    { provide: CARE_GOAL_REPOSITORY, useClass: CareGoalPrismaRepository },
    { provide: CARE_PLAN_SCHEDULE_REPOSITORY, useClass: CarePlanSchedulePrismaRepository },
    { provide: CARE_INSTRUCTION_REPOSITORY, useClass: CareInstructionPrismaRepository },
    { provide: CARE_PLAN_REVISION_REPOSITORY, useClass: CarePlanRevisionPrismaRepository },
  ],
  exports: [
    CARE_RECIPIENT_REPOSITORY,
    CARE_GOAL_REPOSITORY,
    CARE_PLAN_SCHEDULE_REPOSITORY,
    CARE_INSTRUCTION_REPOSITORY,
    CARE_PLAN_REVISION_REPOSITORY,
    SetCareGoalsUseCase,
  ],
})
export class CareRecipientsModule {}
