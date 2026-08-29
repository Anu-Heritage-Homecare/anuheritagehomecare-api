import { Controller, Get, Param, ParseUUIDPipe, StreamableFile, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import { AuthenticatedPrincipal } from '@shared/presentation/authenticated-principal';
import { CurrentUser } from '@shared/presentation/current-user.decorator';
import { JwtAuthGuard } from '@shared/presentation/jwt-auth.guard';
import { buildZip } from '@shared/infrastructure/storage/zip-archive';
import { DownloadVisitPhotosUseCase } from '../application/use-cases/download-visit-photos.use-case';
import { GetCareOverviewUseCase } from '../application/use-cases/get-care-overview.use-case';
import { GetCarePlanUseCase } from '../application/use-cases/get-care-plan.use-case';
import { GetFamilyVisitDetailUseCase } from '../application/use-cases/get-family-visit-detail.use-case';
import { GetRecipientHealthUseCase } from '../application/use-cases/get-recipient-health.use-case';
import { GetRecipientVisitsUseCase } from '../application/use-cases/get-recipient-visits.use-case';
import {
  CareOverviewResponseDto,
  CarePlanResponseDto,
  RecipientHealthResponseDto,
} from './dto/care-section-response.dto';
import {
  FamilyVisitDetailResponseDto,
  FamilyVisitsResponseDto,
} from './dto/family-visit-response.dto';

/**
 * Family owner Care section reads. Every route requires a valid access token and
 * is scoped to the owner, who can only ever read their own recipients and visits.
 */
@ApiTags('family-care')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'family', version: '1' })
export class FamilyCareController {
  constructor(
    private readonly getOverview: GetCareOverviewUseCase,
    private readonly getHealth: GetRecipientHealthUseCase,
    private readonly getCarePlan: GetCarePlanUseCase,
    private readonly getVisits: GetRecipientVisitsUseCase,
    private readonly getVisitDetail: GetFamilyVisitDetailUseCase,
    private readonly downloadPhotos: DownloadVisitPhotosUseCase,
  ) {}

  @Get('care-recipients/:id/overview')
  @ApiOperation({ summary: 'The Care Overview for a recipient' })
  @ApiOkResponse({ type: CareOverviewResponseDto })
  async overview(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CareOverviewResponseDto> {
    const result = await this.getOverview.execute({
      ownerId: principal.userId,
      careRecipientId: id,
    });
    return CareOverviewResponseDto.fromResult(result);
  }

  @Get('care-recipients/:id/health')
  @ApiOperation({ summary: "Today's vitals and observations for a recipient" })
  @ApiOkResponse({ type: RecipientHealthResponseDto })
  async health(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<RecipientHealthResponseDto> {
    const result = await this.getHealth.execute({ ownerId: principal.userId, careRecipientId: id });
    return RecipientHealthResponseDto.fromResult(result);
  }

  @Get('care-recipients/:id/care-plan')
  @ApiOperation({ summary: "A recipient's care plan (goals, services, schedule, caregivers)" })
  @ApiOkResponse({ type: CarePlanResponseDto })
  async carePlan(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CarePlanResponseDto> {
    const result = await this.getCarePlan.execute({
      ownerId: principal.userId,
      careRecipientId: id,
    });
    return CarePlanResponseDto.fromResult(result);
  }

  @Get('care-recipients/:id/visits')
  @ApiOperation({ summary: "A recipient's current and past visits" })
  @ApiOkResponse({ type: FamilyVisitsResponseDto })
  async visits(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<FamilyVisitsResponseDto> {
    const result = await this.getVisits.execute({ ownerId: principal.userId, careRecipientId: id });
    return FamilyVisitsResponseDto.fromResult(result);
  }

  @Get('visits/:id')
  @ApiOperation({ summary: 'The full visit detail (timeline, tasks, health, notes, photos)' })
  @ApiOkResponse({ type: FamilyVisitDetailResponseDto })
  async visitDetail(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<FamilyVisitDetailResponseDto> {
    const result = await this.getVisitDetail.execute({ ownerId: principal.userId, visitId: id });
    return FamilyVisitDetailResponseDto.fromResult(result);
  }

  @Get('visits/:id/photos/download')
  @ApiOperation({ summary: "Download all of a visit's photos as a single zip archive" })
  @ApiProduces('application/zip')
  @ApiOkResponse({ schema: { type: 'string', format: 'binary' } })
  async downloadVisitPhotos(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<StreamableFile> {
    const result = await this.downloadPhotos.execute({ ownerId: principal.userId, visitId: id });
    const zip = buildZip(result.files);
    return new StreamableFile(zip, {
      type: 'application/zip',
      disposition: `attachment; filename="${result.filename}"`,
    });
  }
}
