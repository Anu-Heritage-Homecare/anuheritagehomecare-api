import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { GENERATED_REPORT_REPOSITORY } from './domain/generated-report.repository';
import { REPORTS_OVERVIEW_READ_MODEL } from './application/ports/reports-overview-read.port';
import { OPERATIONS_REPORT_READ_MODEL } from './application/ports/operations-report-read.port';
import { WORKFORCE_REPORT_READ_MODEL } from './application/ports/workforce-report-read.port';
import { GenerateReportUseCase } from './application/use-cases/generate-report.use-case';
import { GetOperationsReportUseCase } from './application/use-cases/get-operations-report.use-case';
import { GetReportsOverviewUseCase } from './application/use-cases/get-reports-overview.use-case';
import { GetWorkforceReportUseCase } from './application/use-cases/get-workforce-report.use-case';
import { GeneratedReportPrismaRepository } from './infrastructure/persistence/generated-report.prisma.repository';
import { OperationsReportReadPrisma } from './infrastructure/persistence/operations-report-read.prisma';
import { ReportsOverviewReadPrisma } from './infrastructure/persistence/reports-overview-read.prisma';
import { WorkforceReportReadPrisma } from './infrastructure/persistence/workforce-report-read.prisma';
import { ReportsController } from './presentation/reports.controller';

/**
 * Admin Reports bounded context composition root. A read aggregator for the Reports
 * screen plus the Generate Report action; it queries the operational, workforce,
 * rating and billing tables directly through its own read model.
 */
@Module({
  imports: [PassportModule],
  controllers: [ReportsController],
  providers: [
    GetReportsOverviewUseCase,
    GenerateReportUseCase,
    GetOperationsReportUseCase,
    GetWorkforceReportUseCase,
    { provide: REPORTS_OVERVIEW_READ_MODEL, useClass: ReportsOverviewReadPrisma },
    { provide: OPERATIONS_REPORT_READ_MODEL, useClass: OperationsReportReadPrisma },
    { provide: WORKFORCE_REPORT_READ_MODEL, useClass: WorkforceReportReadPrisma },
    { provide: GENERATED_REPORT_REPOSITORY, useClass: GeneratedReportPrismaRepository },
  ],
})
export class AdminReportsModule {}
