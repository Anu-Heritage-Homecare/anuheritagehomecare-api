import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuthenticatedPrincipal } from '@shared/presentation/authenticated-principal';
import { CurrentUser } from '@shared/presentation/current-user.decorator';
import { JwtAuthGuard } from '@shared/presentation/jwt-auth.guard';
import { CreateCareRecipientDraftUseCase } from '../application/use-cases/create-care-recipient-draft.use-case';
import { CreateCareRecipientPhotoTicketUseCase } from '../application/use-cases/create-care-recipient-photo-ticket.use-case';
import { FinalizeCareRecipientUseCase } from '../application/use-cases/finalize-care-recipient.use-case';
import { GetCareRecipientUseCase } from '../application/use-cases/get-care-recipient.use-case';
import { ListCareRecipientsUseCase } from '../application/use-cases/list-care-recipients.use-case';
import { UpdateCareNeedsUseCase } from '../application/use-cases/update-care-needs.use-case';
import { UpdateCareScheduleUseCase } from '../application/use-cases/update-care-schedule.use-case';
import { UpdateHealthInformationUseCase } from '../application/use-cases/update-health-information.use-case';
import { CareRecipientResponseDto } from './dto/care-recipient-response.dto';
import { CareRecipientPhotoTicketResponseDto } from './dto/photo-upload-ticket-response.dto';
import { CreateCareRecipientDraftRequestDto } from './dto/create-care-recipient-draft-request.dto';
import { UpdateCareNeedsRequestDto } from './dto/update-care-needs-request.dto';
import { UpdateCareScheduleRequestDto } from './dto/update-care-schedule-request.dto';
import { UpdateHealthInformationRequestDto } from './dto/update-health-information-request.dto';

/**
 * HTTP entry point for care recipient onboarding. Every route requires a valid
 * access token and is scoped to the authenticated family owner, so one owner can
 * only ever read or change their own loved ones' records. Controllers stay thin:
 * they translate HTTP into application commands and back into response DTOs.
 */
@ApiTags('care-recipients')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'care-recipients', version: '1' })
export class CareRecipientsController {
  constructor(
    private readonly createDraft: CreateCareRecipientDraftUseCase,
    private readonly updateCareNeeds: UpdateCareNeedsUseCase,
    private readonly updateHealth: UpdateHealthInformationUseCase,
    private readonly updateSchedule: UpdateCareScheduleUseCase,
    private readonly finalize: FinalizeCareRecipientUseCase,
    private readonly getOne: GetCareRecipientUseCase,
    private readonly list: ListCareRecipientsUseCase,
    private readonly createPhotoTicket: CreateCareRecipientPhotoTicketUseCase,
  ) {}

  @Post('photo/upload-ticket')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Issue a signed ticket to upload a loved one's profile photo",
    description:
      'Upload the file directly to the returned uploadUrl, then send the returned key ' +
      'as photoKey when creating or updating the care recipient draft.',
  })
  @ApiCreatedResponse({ type: CareRecipientPhotoTicketResponseDto })
  issuePhotoTicket(
    @CurrentUser() principal: AuthenticatedPrincipal,
  ): CareRecipientPhotoTicketResponseDto {
    const ticket = this.createPhotoTicket.execute({ ownerId: principal.userId });
    return CareRecipientPhotoTicketResponseDto.fromTicket(ticket);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Start a care recipient onboarding draft (step 1: profile)' })
  @ApiCreatedResponse({ type: CareRecipientResponseDto })
  async create(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Body() body: CreateCareRecipientDraftRequestDto,
  ): Promise<CareRecipientResponseDto> {
    const result = await this.createDraft.execute({ ownerId: principal.userId, ...body });
    return CareRecipientResponseDto.fromResult(result);
  }

  @Get()
  @ApiOperation({ summary: 'List the owner care recipients, including in progress drafts' })
  @ApiOkResponse({ type: CareRecipientResponseDto, isArray: true })
  async findAll(
    @CurrentUser() principal: AuthenticatedPrincipal,
  ): Promise<CareRecipientResponseDto[]> {
    const results = await this.list.execute({ ownerId: principal.userId });
    return results.map((result) => CareRecipientResponseDto.fromResult(result));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Fetch a care recipient (use nextStep to resume onboarding)' })
  @ApiOkResponse({ type: CareRecipientResponseDto })
  async findOne(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<CareRecipientResponseDto> {
    const result = await this.getOne.execute({ ownerId: principal.userId, careRecipientId: id });
    return CareRecipientResponseDto.fromResult(result);
  }

  @Put(':id/care-needs')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Save care needs (step 2)' })
  @ApiOkResponse({ type: CareRecipientResponseDto })
  async saveCareNeeds(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: UpdateCareNeedsRequestDto,
  ): Promise<CareRecipientResponseDto> {
    const result = await this.updateCareNeeds.execute({
      ownerId: principal.userId,
      careRecipientId: id,
      careNeeds: body.careNeeds,
    });
    return CareRecipientResponseDto.fromResult(result);
  }

  @Put(':id/health')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Save health and medication information (step 3)' })
  @ApiOkResponse({ type: CareRecipientResponseDto })
  async saveHealth(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: UpdateHealthInformationRequestDto,
  ): Promise<CareRecipientResponseDto> {
    const result = await this.updateHealth.execute({
      ownerId: principal.userId,
      careRecipientId: id,
      medicalConditions: body.medicalConditions,
      allergies: body.allergies,
      needsMedicationHelp: body.needsMedicationHelp,
      medications: body.medications,
    });
    return CareRecipientResponseDto.fromResult(result);
  }

  @Put(':id/schedule')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Save the care schedule (step 4)' })
  @ApiOkResponse({ type: CareRecipientResponseDto })
  async saveSchedule(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: UpdateCareScheduleRequestDto,
  ): Promise<CareRecipientResponseDto> {
    const result = await this.updateSchedule.execute({
      ownerId: principal.userId,
      careRecipientId: id,
      frequency: body.frequency,
      estimatedStartDate: body.estimatedStartDate,
      expectedDuration: body.expectedDuration,
      days: body.days,
      startMinute: body.startMinute,
      visitDurationMinutes: body.visitDurationMinutes,
    });
    return CareRecipientResponseDto.fromResult(result);
  }

  @Post(':id/finalize')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Finalise onboarding and activate the care recipient' })
  @ApiOkResponse({ type: CareRecipientResponseDto })
  async finalizeOnboarding(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<CareRecipientResponseDto> {
    const result = await this.finalize.execute({
      ownerId: principal.userId,
      careRecipientId: id,
    });
    return CareRecipientResponseDto.fromResult(result);
  }
}
