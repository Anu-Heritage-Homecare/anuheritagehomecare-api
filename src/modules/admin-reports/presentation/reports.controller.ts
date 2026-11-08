import { Body, Controller, Get, Post, Query, StreamableFile, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import { Currency } from '@shared/domain/currency.enum';
import { AdminPrincipal } from '@shared/presentation/admin-principal';
import { AdminJwtAuthGuard } from '@shared/presentation/admin-jwt-auth.guard';
import { CurrentAdmin } from '@shared/presentation/current-admin.decorator';
import { GenerateReportUseCase } from '../application/use-cases/generate-report.use-case';
import { GetReportsOverviewUseCase } from '../application/use-cases/get-reports-overview.use-case';
import { buildReportsOverviewPdf } from '../infrastructure/export/reports-overview-pdf';
import { buildReportsOverviewXlsx } from '../infrastructure/export/reports-overview-xlsx';
import { GenerateReportRequestDto, GenerateReportResponseDto } from './dto/generate-report.dto';
import { ReportsOverviewQueryDto } from './dto/reports-overview-query.dto';
import { ReportsOverviewResponseDto } from './dto/reports-overview-response.dto';

function parseCurrency(value: Currency | undefined): Currency {
  return value ?? Currency.NigerianNaira;
}

function parseDate(value: string | undefined): Date | null {
  return value === undefined ? null : new Date(value);
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
}
