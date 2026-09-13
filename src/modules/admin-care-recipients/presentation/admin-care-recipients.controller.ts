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
import { HealthEventCategory } from '@modules/care-recipients/domain/health-event-category.enum';
import { AdminJwtAuthGuard } from '@shared/presentation/admin-jwt-auth.guard';
import { AdminPrincipal } from '@shared/presentation/admin-principal';
import { CurrentAdmin } from '@shared/presentation/current-admin.decorator';
import { AddCareRecipientUseCase } from '../application/use-cases/add-care-recipient.use-case';
import { AddMedicationUseCase } from '../application/use-cases/add-medication.use-case';
import { ChangeCareRecipientStatusUseCase } from '../application/use-cases/change-care-recipient-status.use-case';
import { DiscontinueMedicationUseCase } from '../application/use-cases/discontinue-medication.use-case';
import { GetCarePlanUseCase } from '../application/use-cases/get-care-plan.use-case';
import { GetCareRecipientProfileUseCase } from '../application/use-cases/get-care-recipient-profile.use-case';
import { GetRecipientHealthUseCase } from '../application/use-cases/get-recipient-health.use-case';
import { GetRecipientMedicationsUseCase } from '../application/use-cases/get-recipient-medications.use-case';
import { GetRecipientVisitsUseCase } from '../application/use-cases/get-recipient-visits.use-case';
import { ListCareRecipientsUseCase } from '../application/use-cases/list-care-recipients.use-case';
import { SetCarePlanGoalsUseCase } from '../application/use-cases/set-care-plan-goals.use-case';
import { SetCarePlanInstructionsUseCase } from '../application/use-cases/set-care-plan-instructions.use-case';
import { SetCarePlanScheduleUseCase } from '../application/use-cases/set-care-plan-schedule.use-case';
import { SetCareRecipientPriorityUseCase } from '../application/use-cases/set-care-recipient-priority.use-case';
import { SetMedicationWarningsUseCase } from '../application/use-cases/set-medication-warnings.use-case';
import { SetPrimaryCaregiverUseCase } from '../application/use-cases/set-primary-caregiver.use-case';
import { UpdateMedicationUseCase } from '../application/use-cases/update-medication.use-case';
import { CarePlanResponseDto } from './dto/care-plan-response.dto';
import {
  DiscontinueMedicationRequestDto,
  MedicationRequestDto,
  SetMedicationWarningsRequestDto,
} from './dto/medication-write.dto';
import { HealthTimelineTab, RecipientHealthQueryDto } from './dto/recipient-health-query.dto';
import { RecipientHealthResponseDto } from './dto/recipient-health-response.dto';
import { RecipientMedicationsResponseDto } from './dto/recipient-medications-response.dto';
import { RecipientVisitsQueryDto } from './dto/recipient-visits-query.dto';
import { RecipientVisitsResponseDto } from './dto/recipient-visits-response.dto';
import {
  SetGoalsRequestDto,
  SetInstructionsRequestDto,
  SetScheduleRequestDto,
} from './dto/care-plan-write.dto';
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
    private readonly visits: GetRecipientVisitsUseCase,
    private readonly medications: GetRecipientMedicationsUseCase,
    private readonly health: GetRecipientHealthUseCase,
    private readonly addMedication: AddMedicationUseCase,
    private readonly updateMedication: UpdateMedicationUseCase,
    private readonly discontinueMedication: DiscontinueMedicationUseCase,
    private readonly setMedicationWarnings: SetMedicationWarningsUseCase,
    private readonly carePlan: GetCarePlanUseCase,
    private readonly setGoals: SetCarePlanGoalsUseCase,
    private readonly setSchedule: SetCarePlanScheduleUseCase,
    private readonly setInstructions: SetCarePlanInstructionsUseCase,
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

  @Get(':id/visits')
  @ApiOperation({
    summary: 'The visits tab: summary cards, filtered visit history and visit analytics',
  })
  @ApiOkResponse({ type: RecipientVisitsResponseDto })
  async getVisits(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: RecipientVisitsQueryDto,
  ): Promise<RecipientVisitsResponseDto> {
    const result = await this.visits.execute({
      recipientId: id,
      from: query.from ? new Date(query.from) : null,
      to: query.to ? new Date(query.to) : null,
      caregiverId: query.caregiverId ?? null,
      visitType: query.visitType ?? null,
      status: query.status ?? null,
      search: query.search ?? null,
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 10,
    });
    return RecipientVisitsResponseDto.fromResult(result);
  }

  @Get(':id/medications')
  @ApiOperation({
    summary: 'The medications tab: cards, prescriptions, dose schedule, warnings and audit',
  })
  @ApiOkResponse({ type: RecipientMedicationsResponseDto })
  async getMedications(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<RecipientMedicationsResponseDto> {
    const result = await this.medications.execute(id);
    return RecipientMedicationsResponseDto.fromResult(result);
  }

  @Get(':id/health')
  @ApiOperation({
    summary: 'The health tab: conditions, last vitals, next appointment, trend and timeline',
  })
  @ApiOkResponse({ type: RecipientHealthResponseDto })
  async getHealth(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: RecipientHealthQueryDto,
  ): Promise<RecipientHealthResponseDto> {
    const result = await this.health.execute({
      recipientId: id,
      categories: categoriesForTab(query.tab ?? 'ALL'),
      search: query.search ?? null,
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 8,
    });
    return RecipientHealthResponseDto.fromResult(result);
  }

  @Post(':id/medications')
  @ApiOperation({ summary: 'Add a prescription (records an audit entry)' })
  @ApiCreatedResponse()
  async createMedication(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: MedicationRequestDto,
    @CurrentAdmin() principal: AdminPrincipal,
  ): Promise<{ id: string }> {
    return this.addMedication.execute({
      recipientId: id,
      adminId: principal.adminUserId,
      name: body.name,
      dose: body.dose,
      purpose: body.purpose,
      prescribedBy: body.prescribedBy,
      startDate: body.startDate ? new Date(body.startDate) : null,
      instructions: body.instructions,
      doseTimes: body.doseTimes ?? null,
      note: body.note,
    });
  }

  // Declared before the ":medicationId" route so "warnings" is not read as an id.
  @Put(':id/medications/warnings')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Replace the medication clinical warning profile (records an audit)' })
  async saveMedicationWarnings(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: SetMedicationWarningsRequestDto,
    @CurrentAdmin() principal: AdminPrincipal,
  ): Promise<{ warningCount: number }> {
    return this.setMedicationWarnings.execute({
      recipientId: id,
      adminId: principal.adminUserId,
      note: body.note,
      warnings: body.warnings,
    });
  }

  @Put(':id/medications/:medicationId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Edit a prescription (records an audit entry)' })
  async editMedication(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('medicationId', ParseUUIDPipe) medicationId: string,
    @Body() body: MedicationRequestDto,
    @CurrentAdmin() principal: AdminPrincipal,
  ): Promise<{ id: string }> {
    return this.updateMedication.execute({
      recipientId: id,
      medicationId,
      adminId: principal.adminUserId,
      name: body.name,
      dose: body.dose,
      purpose: body.purpose,
      prescribedBy: body.prescribedBy,
      startDate: body.startDate ? new Date(body.startDate) : null,
      instructions: body.instructions,
      doseTimes: body.doseTimes ?? null,
      note: body.note,
    });
  }

  @Post(':id/medications/:medicationId/discontinue')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Discontinue a prescription (records an audit entry)' })
  async stopMedication(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('medicationId', ParseUUIDPipe) medicationId: string,
    @Body() body: DiscontinueMedicationRequestDto,
    @CurrentAdmin() principal: AdminPrincipal,
  ): Promise<{ id: string }> {
    return this.discontinueMedication.execute({
      recipientId: id,
      medicationId,
      adminId: principal.adminUserId,
      note: body.note,
    });
  }

  @Get(':id/care-plan')
  @ApiOperation({ summary: 'The care plan: goals, daily schedule, instructions and revisions' })
  @ApiOkResponse({ type: CarePlanResponseDto })
  async getCarePlan(@Param('id', ParseUUIDPipe) id: string): Promise<CarePlanResponseDto> {
    const result = await this.carePlan.execute(id);
    return CarePlanResponseDto.fromResult(result);
  }

  @Put(':id/care-plan/goals')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Replace the care goals (records a revision)' })
  async saveGoals(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: SetGoalsRequestDto,
    @CurrentAdmin() principal: AdminPrincipal,
  ): Promise<{ goalCount: number }> {
    return this.setGoals.execute({
      recipientId: id,
      adminId: principal.adminUserId,
      revisionNote: body.revisionNote,
      goals: body.goals,
    });
  }

  @Put(':id/care-plan/schedule')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Replace the daily care schedule (records a revision)' })
  async saveSchedule(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: SetScheduleRequestDto,
    @CurrentAdmin() principal: AdminPrincipal,
  ): Promise<{ blockCount: number }> {
    return this.setSchedule.execute({
      recipientId: id,
      adminId: principal.adminUserId,
      revisionNote: body.revisionNote,
      blocks: body.blocks,
    });
  }

  @Put(':id/care-plan/instructions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Replace the care instructions (records a revision)' })
  async saveInstructions(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: SetInstructionsRequestDto,
    @CurrentAdmin() principal: AdminPrincipal,
  ): Promise<{ instructionCount: number }> {
    return this.setInstructions.execute({
      recipientId: id,
      adminId: principal.adminUserId,
      revisionNote: body.revisionNote,
      instructions: body.instructions,
    });
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

/** Map a health timeline filter tab to the health event categories it covers. */
function categoriesForTab(tab: HealthTimelineTab): HealthEventCategory[] | null {
  switch (tab) {
    case 'VITALS':
      return [HealthEventCategory.Vitals];
    case 'INCIDENTS':
      return [HealthEventCategory.Incident];
    case 'MEDICATION':
      return [HealthEventCategory.Medication];
    case 'ASSESSMENTS':
      return [HealthEventCategory.Assessment];
    case 'APPOINTMENTS':
      return [HealthEventCategory.Appointment, HealthEventCategory.Specialist];
    case 'ALL':
    default:
      return null;
  }
}
