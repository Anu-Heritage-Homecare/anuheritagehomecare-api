import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminJwtAuthGuard } from '@shared/presentation/admin-jwt-auth.guard';
import { GetFamiliesKpisUseCase } from '../application/use-cases/get-families-kpis.use-case';
import { GetFamilyDetailUseCase } from '../application/use-cases/get-family-detail.use-case';
import { ListFamiliesUseCase } from '../application/use-cases/list-families.use-case';
import {
  FamilyDetailResponseDto,
  FamilyKpisResponseDto,
  FamilyListResponseDto,
} from './dto/family-directory-response.dto';
import { FamiliesQueryDto } from './dto/families-query.dto';

/**
 * Admin Families directory: the family member accounts, their linked care recipients
 * and billing status. Requires a valid admin token. Controllers stay thin.
 */
@ApiTags('admin-families')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard)
@Controller({ path: 'admin/families', version: '1' })
export class AdminFamiliesController {
  constructor(
    private readonly listFamilies: ListFamiliesUseCase,
    private readonly getKpis: GetFamiliesKpisUseCase,
    private readonly getDetail: GetFamilyDetailUseCase,
  ) {}

  @Get('kpis')
  @ApiOperation({ summary: 'The Families KPI bar' })
  @ApiOkResponse({ type: FamilyKpisResponseDto })
  async kpis(): Promise<FamilyKpisResponseDto> {
    const result = await this.getKpis.execute();
    return FamilyKpisResponseDto.fromResult(result);
  }

  @Get()
  @ApiOperation({ summary: 'The family directory table, optionally filtered by status' })
  @ApiOkResponse({ type: FamilyListResponseDto })
  async list(@Query() query: FamiliesQueryDto): Promise<FamilyListResponseDto> {
    const result = await this.listFamilies.execute({
      status: query.status ?? null,
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
    });
    return FamilyListResponseDto.fromResult(result);
  }

  @Get(':id')
  @ApiOperation({ summary: 'The Quick Preview drawer detail for one family member' })
  @ApiOkResponse({ type: FamilyDetailResponseDto })
  async detail(@Param('id', ParseUUIDPipe) id: string): Promise<FamilyDetailResponseDto> {
    const result = await this.getDetail.execute(id);
    return FamilyDetailResponseDto.fromResult(result);
  }
}
