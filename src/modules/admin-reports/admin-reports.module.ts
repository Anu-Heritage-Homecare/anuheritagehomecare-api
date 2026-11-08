import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { GENERATED_REPORT_REPOSITORY } from './domain/generated-report.repository';
import { REPORTS_OVERVIEW_READ_MODEL } from './application/ports/reports-overview-read.port';
import { GenerateReportUseCase } from './application/use-cases/generate-report.use-case';
import { GetReportsOverviewUseCase } from './application/use-cases/get-reports-overview.use-case';
import { GeneratedReportPrismaRepository } from './infrastructure/persistence/generated-report.prisma.repository';
import { ReportsOverviewReadPrisma } from './infrastructure/persistence/reports-overview-read.prisma';
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
    { provide: REPORTS_OVERVIEW_READ_MODEL, useClass: ReportsOverviewReadPrisma },
    { provide: GENERATED_REPORT_REPOSITORY, useClass: GeneratedReportPrismaRepository },
  ],
})
export class AdminReportsModule {}
