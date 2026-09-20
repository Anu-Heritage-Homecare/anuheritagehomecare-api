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
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CaregiverEmploymentType } from '@modules/caregiver-profile/domain/caregiver-employment-type.enum';
import { CaregiverStatus } from '@modules/caregiver-profile/domain/caregiver-status.enum';
import { AdminJwtAuthGuard } from '@shared/presentation/admin-jwt-auth.guard';
import { AdminPrincipal } from '@shared/presentation/admin-principal';
import { CurrentAdmin } from '@shared/presentation/current-admin.decorator';
import {
  AddCaregiverNoteUseCase,
  DeleteCaregiverUseCase,
  EditCaregiverUseCase,
} from '../application/use-cases/edit-caregiver.use-case';
import { GetCaregiverOverviewUseCase } from '../application/use-cases/get-caregiver-overview.use-case';
import {
  CaregiverScheduleResult,
  GetCaregiverScheduleUseCase,
} from '../application/use-cases/get-caregiver-schedule.use-case';
import { ListCaregiversUseCase } from '../application/use-cases/list-caregivers.use-case';
import {
  CaregiverListResponseDto,
  CaregiverOverviewResponseDto,
} from './dto/caregiver-response.dto';
import { CaregiversQueryDto } from './dto/caregivers-query.dto';
import {
  CaregiverEmergencyDto,
  CaregiverLanguagesDto,
  CaregiverNoteDto,
  CaregiverPreferencesDto,
  CaregiverScheduleQueryDto,
  CaregiverSkillsDto,
  CaregiverStatusDto,
  EditCaregiverProfileDto,
} from './dto/caregiver-write.dto';

function toDomainStatus(status: string): CaregiverStatus {
  return (
    Object.values(CaregiverStatus).find((value) => String(value) === status) ??
    CaregiverStatus.Active
  );
}

function toDomainEmployment(value: string | undefined): CaregiverEmploymentType | undefined {
  if (value === undefined) {
    return undefined;
  }
  return Object.values(CaregiverEmploymentType).find((v) => String(v) === value);
}

/**
 * Admin Caregivers panel: the directory, the profile Overview and Schedule tabs, and
 * the profile edit actions. Requires a valid admin token. Controllers stay thin.
 */
@ApiTags('admin-caregivers')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard)
@Controller({ path: 'admin/caregivers', version: '1' })
export class AdminCaregiversController {
  constructor(
    private readonly listCaregivers: ListCaregiversUseCase,
    private readonly getOverview: GetCaregiverOverviewUseCase,
    private readonly getSchedule: GetCaregiverScheduleUseCase,
    private readonly editCaregiver: EditCaregiverUseCase,
    private readonly addNote: AddCaregiverNoteUseCase,
    private readonly deleteCaregiver: DeleteCaregiverUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'The caregivers directory, optionally filtered by status' })
  @ApiOkResponse({ type: CaregiverListResponseDto })
  async list(@Query() query: CaregiversQueryDto): Promise<CaregiverListResponseDto> {
    const result = await this.listCaregivers.execute({
      status: query.status ?? null,
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
    });
    return CaregiverListResponseDto.fromResult(result);
  }

  @Get(':id/overview')
  @ApiOperation({ summary: 'The caregiver Overview tab' })
  @ApiOkResponse({ type: CaregiverOverviewResponseDto })
  async overview(@Param('id', ParseUUIDPipe) id: string): Promise<CaregiverOverviewResponseDto> {
    const result = await this.getOverview.execute(id);
    return CaregiverOverviewResponseDto.fromResult(result);
  }

  @Get(':id/schedule')
  @ApiOperation({ summary: 'The caregiver Schedule tab over a date range' })
  @ApiOkResponse()
  async schedule(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: CaregiverScheduleQueryDto,
  ): Promise<CaregiverScheduleResult> {
    return this.getSchedule.execute({
      profileId: id,
      from: new Date(query.from),
      to: new Date(query.to),
    });
  }

  @Put(':id/profile')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Edit the general profile fields of a caregiver' })
  @ApiNoContentResponse()
  async editProfile(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: EditCaregiverProfileDto,
  ): Promise<void> {
    await this.editCaregiver.execute({
      profileId: id,
      section: 'PROFILE',
      fields: {
        title: body.title,
        branch: body.branch,
        supervisorName: body.supervisorName,
        employmentType: toDomainEmployment(body.employmentType),
        experienceYears: body.experienceYears,
        joinedAt: body.joinedAt === undefined ? undefined : new Date(body.joinedAt),
        maxHoursPerWeek: body.maxHoursPerWeek,
        preferredShift: body.preferredShift,
      },
    });
  }

  @Put(':id/skills')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Set the skills of a caregiver' })
  @ApiNoContentResponse()
  async editSkills(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: CaregiverSkillsDto,
  ): Promise<void> {
    await this.editCaregiver.execute({ profileId: id, section: 'SKILLS', skills: body.skills });
  }

  @Put(':id/languages')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Set the languages of a caregiver' })
  @ApiNoContentResponse()
  async editLanguages(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: CaregiverLanguagesDto,
  ): Promise<void> {
    await this.editCaregiver.execute({
      profileId: id,
      section: 'LANGUAGES',
      languages: body.languages,
    });
  }

  @Put(':id/emergency-contact')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Set the emergency contact of a caregiver' })
  @ApiNoContentResponse()
  async editEmergency(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: CaregiverEmergencyDto,
  ): Promise<void> {
    await this.editCaregiver.execute({
      profileId: id,
      section: 'EMERGENCY',
      contact: {
        name: body.name ?? null,
        phone: body.phone ?? null,
        relationship: body.relationship ?? null,
        email: body.email ?? null,
      },
    });
  }

  @Put(':id/preferences')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Set the internal notes and caregiver preferences free text' })
  @ApiNoContentResponse()
  async editPreferences(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: CaregiverPreferencesDto,
  ): Promise<void> {
    await this.editCaregiver.execute({
      profileId: id,
      section: 'PREFERENCES',
      preferencesNote: body.preferencesNote ?? null,
    });
  }

  @Put(':id/status')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Set the status of a caregiver' })
  @ApiNoContentResponse()
  async editStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: CaregiverStatusDto,
  ): Promise<void> {
    await this.editCaregiver.execute({
      profileId: id,
      section: 'STATUS',
      status: toDomainStatus(body.status),
    });
  }

  @Post(':id/notes')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Add a note to a caregiver' })
  @ApiNoContentResponse()
  async note(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: CaregiverNoteDto,
    @CurrentAdmin() principal: AdminPrincipal,
  ): Promise<void> {
    await this.addNote.execute({
      profileId: id,
      adminId: principal.adminUserId,
      body: body.body,
      authorName: body.authorName ?? null,
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Archive a caregiver profile so it leaves the directory' })
  @ApiNoContentResponse()
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.deleteCaregiver.execute(id);
  }
}
