import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { SERVICE_OFFERING_REPOSITORY } from './domain/service-offering.repository';
import { VISIT_FORMAT_REPOSITORY } from './domain/visit-format.repository';
import { SCHEDULING_GUARDRAILS_REPOSITORY } from './domain/scheduling-guardrails.repository';
import { TASK_CHECKLIST_READ_PORT } from './application/ports/task-checklist-read.port';
import { GetCareOperationsUseCase } from './application/use-cases/get-care-operations.use-case';
import {
  AddServiceOfferingUseCase,
  DeleteServiceOfferingUseCase,
  UpdateServiceOfferingUseCase,
} from './application/use-cases/service-offering.use-cases';
import { UpdateGuardrailsUseCase } from './application/use-cases/update-guardrails.use-case';
import {
  AddVisitFormatUseCase,
  DeleteVisitFormatUseCase,
  UpdateVisitFormatUseCase,
} from './application/use-cases/visit-format.use-cases';
import { ServiceOfferingPrismaRepository } from './infrastructure/persistence/service-offering.prisma.repository';
import { VisitFormatPrismaRepository } from './infrastructure/persistence/visit-format.prisma.repository';
import { SchedulingGuardrailsPrismaRepository } from './infrastructure/persistence/scheduling-guardrails.prisma.repository';
import { TaskChecklistReadPrisma } from './infrastructure/persistence/task-checklist-read.prisma';
import { CareOperationsController } from './presentation/care-operations.controller';

/**
 * Admin Care Operations bounded context composition root. Powers Settings > Care
 * Operations: service offerings, visit formats with per currency rates, the
 * scheduling guardrails, and a read only surface of the existing task templates.
 */
@Module({
  imports: [PassportModule],
  controllers: [CareOperationsController],
  providers: [
    GetCareOperationsUseCase,
    AddServiceOfferingUseCase,
    UpdateServiceOfferingUseCase,
    DeleteServiceOfferingUseCase,
    AddVisitFormatUseCase,
    UpdateVisitFormatUseCase,
    DeleteVisitFormatUseCase,
    UpdateGuardrailsUseCase,
    { provide: SERVICE_OFFERING_REPOSITORY, useClass: ServiceOfferingPrismaRepository },
    { provide: VISIT_FORMAT_REPOSITORY, useClass: VisitFormatPrismaRepository },
    { provide: SCHEDULING_GUARDRAILS_REPOSITORY, useClass: SchedulingGuardrailsPrismaRepository },
    { provide: TASK_CHECKLIST_READ_PORT, useClass: TaskChecklistReadPrisma },
  ],
})
export class AdminOperationsModule {}
