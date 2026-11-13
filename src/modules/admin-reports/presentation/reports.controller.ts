import { Body, Controller, Get, Post, Query, StreamableFile, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import { Currency } from '@shared/domain/currency.enum';
import { AdminPrincipal } from '@shared/presentation/admin-principal';
import { AdminJwtAuthGuard } from '@shared/presentation/admin-jwt-auth.guard';
import { CurrentAdmin } from '@shared/presentation/current-admin.decorator';
import { GenerateReportUseCase } from '../application/use-cases/generate-report.use-case';
import {
  GetOperationsReportUseCase,
  GetOperationsReportCommand,
} from '../application/use-cases/get-operations-report.use-case';
import { GetReportsOverviewUseCase } from '../application/use-cases/get-reports-overview.use-case';
import {
  GetWorkforceReportUseCase,
  GetWorkforceReportCommand,
} from '../application/use-cases/get-workforce-report.use-case';
import { buildOperationsReportPdf } from '../infrastructure/export/operations-report-pdf';
import { buildOperationsReportXlsx } from '../infrastructure/export/operations-report-xlsx';
import { buildReportsOverviewPdf } from '../infrastructure/export/reports-overview-pdf';
import { buildReportsOverviewXlsx } from '../infrastructure/export/reports-overview-xlsx';
import { buildWorkforceReportPdf } from '../infrastructure/export/workforce-report-pdf';
import { buildWorkforceReportXlsx } from '../infrastructure/export/workforce-report-xlsx';
import { GenerateReportRequestDto, GenerateReportResponseDto } from './dto/generate-report.dto';
import { OperationsReportQueryDto } from './dto/operations-report-query.dto';
import { OperationsReportResponseDto } from './dto/operations-report-response.dto';
import { ReportsOverviewQueryDto } from './dto/reports-overview-query.dto';
import { ReportsOverviewResponseDto } from './dto/reports-overview-response.dto';
import { WorkforceReportQueryDto } from './dto/workforce-report-query.dto';
import { WorkforceReportResponseDto } from './dto/workforce-report-response.dto';

function parseCurrency(value: Currency | undefined): Currency {
  return value ?? Currency.NigerianNaira;
}

function parseDate(value: string | undefined): Date | null {
  return value === undefined ? null : new Date(value);
}

function operationsCommand(query: OperationsReportQueryDto): GetOperationsReportCommand {
  return {
    from: parseDate(query.from),
    to: parseDate(query.to),
    visitType: query.serviceType ?? null,
    caregiverId: query.caregiverId ?? null,
    status: query.status ?? null,
    city: query.city ?? null,
  };
}

function workforceCommand(query: WorkforceReportQueryDto): GetWorkforceReportCommand {
  return {
    from: parseDate(query.from),
    to: parseDate(query.to),
    branch: query.branch ?? null,
    caregiverId: query.caregiverId ?? null,
    employmentType: query.employmentType ?? null,
  };
}

/**
 * Admin Reports screen: the one aggregated read that powers the Overview, the Generate
 * Report action that records a report in the activity feed, and the PDF/Excel exports
 * of the current view. Every route requires a valid admin token and is scoped to one
 * market, since money figures cannot cross currencies.
 */
@ApiTags('admin-reports')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard)
@Controller({ path: 'admin/reports', version: '1' })
export class ReportsController {
  constructor(
    private readonly getOverview: GetReportsOverviewUseCase,
    private readonly generateReport: GenerateReportUseCase,
    private readonly getOperations: GetOperationsReportUseCase,
    private readonly getWorkforce: GetWorkforceReportUseCase,
  ) {}

  @Get('overview')
  @ApiOperation({ summary: 'The whole Reports Overview screen in one read' })
  @ApiOkResponse({ type: ReportsOverviewResponseDto })
  async overview(@Query() query: ReportsOverviewQueryDto): Promise<ReportsOverviewResponseDto> {
    const result = await this.getOverview.execute({
      currency: parseCurrency(query.currency),
      from: parseDate(query.from),
      to: parseDate(query.to),
    });
    return ReportsOverviewResponseDto.fromResult(result);
  }

  @Post('generate')
  @ApiOperation({
    summary: 'Record a generated report in the activity feed (the Generate Report action)',
  })
  @ApiOkResponse({ type: GenerateReportResponseDto })
  async generate(
    @Body() body: GenerateReportRequestDto,
    @CurrentAdmin() admin: AdminPrincipal,
  ): Promise<GenerateReportResponseDto> {
    const result = await this.generateReport.execute({
      type: body.type,
      format: body.format,
      currency: parseCurrency(body.currency),
      from: parseDate(body.from),
      to: parseDate(body.to),
      adminId: admin.adminUserId,
    });
    return GenerateReportResponseDto.fromResult(result);
  }

  @Get('overview/export/pdf')
  @ApiOperation({ summary: 'Export the Reports Overview as a PDF (the Export PDF action)' })
  @ApiProduces('application/pdf')
  async exportPdf(@Query() query: ReportsOverviewQueryDto): Promise<StreamableFile> {
    const result = await this.getOverview.execute({
      currency: parseCurrency(query.currency),
      from: parseDate(query.from),
      to: parseDate(query.to),
    });
    const { filename, pdf } = buildReportsOverviewPdf(result);
    return new StreamableFile(pdf, {
      type: 'application/pdf',
      disposition: `attachment; filename="${filename}"`,
    });
  }

  @Get('overview/export/xlsx')
  @ApiOperation({
    summary: 'Export the Reports Overview as an Excel workbook (the Export Excel action)',
  })
  @ApiProduces('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  async exportXlsx(@Query() query: ReportsOverviewQueryDto): Promise<StreamableFile> {
    const result = await this.getOverview.execute({
      currency: parseCurrency(query.currency),
      from: parseDate(query.from),
      to: parseDate(query.to),
    });
    const { filename, xlsx } = buildReportsOverviewXlsx(result);
    return new StreamableFile(xlsx, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      disposition: `attachment; filename="${filename}"`,
    });
  }

  @Get('operations')
  @ApiOperation({ summary: 'The Operations Report drill down for a period and filters' })
  @ApiOkResponse({ type: OperationsReportResponseDto })
  async operations(@Query() query: OperationsReportQueryDto): Promise<OperationsReportResponseDto> {
    const result = await this.getOperations.execute(operationsCommand(query));
    return OperationsReportResponseDto.fromResult(result);
  }

  @Get('operations/export/pdf')
  @ApiOperation({ summary: 'Export the Operations Report as a PDF (the Export PDF action)' })
  @ApiProduces('application/pdf')
  async exportOperationsPdf(@Query() query: OperationsReportQueryDto): Promise<StreamableFile> {
    const result = await this.getOperations.execute(operationsCommand(query));
    const { filename, pdf } = buildOperationsReportPdf(result);
    return new StreamableFile(pdf, {
      type: 'application/pdf',
      disposition: `attachment; filename="${filename}"`,
    });
  }

  @Get('operations/export/xlsx')
  @ApiOperation({
    summary: 'Export the Operations Report as an Excel workbook (the Export Excel action)',
  })
  @ApiProduces('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  async exportOperationsXlsx(@Query() query: OperationsReportQueryDto): Promise<StreamableFile> {
    const result = await this.getOperations.execute(operationsCommand(query));
    const { filename, xlsx } = buildOperationsReportXlsx(result);
    return new StreamableFile(xlsx, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      disposition: `attachment; filename="${filename}"`,
    });
  }

  @Get('workforce')
  @ApiOperation({ summary: 'The Workforce Report drill down for a period and filters' })
  @ApiOkResponse({ type: WorkforceReportResponseDto })
  async workforce(@Query() query: WorkforceReportQueryDto): Promise<WorkforceReportResponseDto> {
    const result = await this.getWorkforce.execute(workforceCommand(query));
    return WorkforceReportResponseDto.fromResult(result);
  }

  @Get('workforce/export/pdf')
  @ApiOperation({ summary: 'Export the Workforce Report as a PDF (the Export PDF action)' })
  @ApiProduces('application/pdf')
  async exportWorkforcePdf(@Query() query: WorkforceReportQueryDto): Promise<StreamableFile> {
    const result = await this.getWorkforce.execute(workforceCommand(query));
    const { filename, pdf } = buildWorkforceReportPdf(result);
    return new StreamableFile(pdf, {
      type: 'application/pdf',
      disposition: `attachment; filename="${filename}"`,
    });
  }

  @Get('workforce/export/xlsx')
  @ApiOperation({
    summary: 'Export the Workforce Report as an Excel workbook (the Export Excel action)',
  })
  @ApiProduces('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  async exportWorkforceXlsx(@Query() query: WorkforceReportQueryDto): Promise<StreamableFile> {
    const result = await this.getWorkforce.execute(workforceCommand(query));
    const { filename, xlsx } = buildWorkforceReportXlsx(result);
    return new StreamableFile(xlsx, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      disposition: `attachment; filename="${filename}"`,
    });
  }
}
