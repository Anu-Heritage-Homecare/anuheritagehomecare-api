import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AdminJwtAuthGuard } from '@shared/presentation/admin-jwt-auth.guard';
import { AddCareRecipientUseCase } from '../application/use-cases/add-care-recipient.use-case';
import { ChangeCareRecipientStatusUseCase } from '../application/use-cases/change-care-recipient-status.use-case';
import { GetCareRecipientProfileUseCase } from '../application/use-cases/get-care-recipient-profile.use-case';
import { ListCareRecipientsUseCase } from '../application/use-cases/list-care-recipients.use-case';
import { SetCareRecipientPriorityUseCase } from '../application/use-cases/set-care-recipient-priority.use-case';
import { SetPrimaryCaregiverUseCase } from '../application/use-cases/set-primary-caregiver.use-case';
import { CareRecipientListResponseDto } from './dto/care-recipient-list-response.dto';
import { CareRecipientProfileResponseDto } from './dto/care-recipient-profile-response.dto';
import { ListCareRecipientsQueryDto } from './dto/list-care-recipients-query.dto';
import {
  AddCareRecipientRequestDto,
  ChangeStatusRequestDto,
  SetPriorityRequestDto,
  SetPrimaryCaregiverRequestDto,
} from './dto/care-recipient-write.dto';

/**
 * Admin Care Recipients screen: the paginated, filterable, sortable roster of
 * everyone receiving care, plus the summary cards, filter tab counts and action
 * triggers. Requires a valid admin token. The controller stays thin.
 */
@ApiTags('admin-care-recipients')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard)
@Controller({ path: 'admin/care-recipients', version: '1' })
export class AdminCareRecipientsController {
  constructor(
    private readonly list: ListCareRecipientsUseCase,
    private readonly profile: GetCareRecipientProfileUseCase,
    private readonly addRecipient: AddCareRecipientUseCase,
    private readonly changeStatus: ChangeCareRecipientStatusUseCase,
    private readonly setPriority: SetCareRecipientPriorityUseCase,
    private readonly setPrimaryCaregiver: SetPrimaryCaregiverUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'The care recipients list with summary, tab and trigger counts' })
  @ApiOkResponse({ type: CareRecipientListResponseDto })
  async listRecipients(
    @Query() query: ListCareRecipientsQueryDto,
  ): Promise<CareRecipientListResponseDto> {
    const result = await this.list.execute({
      tab: query.tab ?? 'ALL',
      search: query.search ?? null,
      sortField: query.sort ?? 'NAME',
      sortDirection: query.direction ?? 'ASC',
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 8,
    });
    return CareRecipientListResponseDto.fromResult(result);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'The care recipient profile (Overview): summary, stats, visits and notes',
  })
  @ApiOkResponse({ type: CareRecipientProfileResponseDto })
  async getProfile(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CareRecipientProfileResponseDto> {
    const result = await this.profile.execute(id);
    return CareRecipientProfileResponseDto.fromResult(result);
  }

  @Post()
  @ApiOperation({ summary: 'Add a care recipient (admin provisioned)' })
  @ApiCreatedResponse()
  async create(@Body() body: AddCareRecipientRequestDto): Promise<{ id: string }> {
    return this.addRecipient.execute({
      ownerId: body.ownerId,
      name: body.name,
      gender: body.gender,
      dateOfBirth: new Date(body.dateOfBirth),
      city: body.city,
      state: body.state,
      fullAddress: body.fullAddress,
      relationship: body.relationship,
      livingSituation: body.livingSituation,
      photoKey: body.photoKey ?? null,
      latitude: body.latitude ?? null,
      longitude: body.longitude ?? null,
      priority: body.priority,
    });
  }

  @Post(':id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Place on hold, discharge or reactivate a recipient' })
  async setStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: ChangeStatusRequestDto,
  ): Promise<{ id: string; status: string }> {
    return this.changeStatus.execute({ recipientId: id, action: body.action });
  }

  @Post(':id/priority')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set the care recipient priority' })
  async setRecipientPriority(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: SetPriorityRequestDto,
  ): Promise<{ id: string; priority: string }> {
    return this.setPriority.execute({ recipientId: id, priority: body.priority });
  }

  @Put(':id/primary-caregiver')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Assign or reassign the primary caregiver' })
  async assignCaregiver(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: SetPrimaryCaregiverRequestDto,
  ): Promise<{ id: string; primaryCaregiverId: string | null }> {
    return this.setPrimaryCaregiver.execute({ recipientId: id, caregiverId: body.caregiverId });
  }

  @Delete(':id/primary-caregiver')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear the assigned primary caregiver' })
  async unassignCaregiver(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ id: string; primaryCaregiverId: string | null }> {
    return this.setPrimaryCaregiver.execute({ recipientId: id, caregiverId: null });
  }
}
