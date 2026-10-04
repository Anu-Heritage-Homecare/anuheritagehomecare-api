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
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CaregiverEmploymentType } from '@modules/caregiver-profile/domain/caregiver-employment-type.enum';
import { CaregiverGender } from '@modules/caregiver-profile/domain/caregiver-gender.enum';
import { CaregiverNoteKind } from '@modules/caregiver-profile/domain/caregiver-note-kind.enum';
import { CaregiverStatus } from '@modules/caregiver-profile/domain/caregiver-status.enum';
import { CredentialKind } from '@modules/certifications/domain/credential-kind.enum';
import { AdminJwtAuthGuard } from '@shared/presentation/admin-jwt-auth.guard';
import { AdminPrincipal } from '@shared/presentation/admin-principal';
import { CurrentAdmin } from '@shared/presentation/current-admin.decorator';
import {
  AddCaregiverNoteUseCase,
  DeleteCaregiverUseCase,
  EditCaregiverUseCase,
} from '../application/use-cases/edit-caregiver.use-case';
import { EditCaregiverPersonalInfoUseCase } from '../application/use-cases/edit-caregiver-personal-info.use-case';
import { GetCaregiverDocumentsUseCase } from '../application/use-cases/get-caregiver-documents.use-case';
import { GetCaregiverNotesUseCase } from '../application/use-cases/get-caregiver-notes.use-case';
import { GetCaregiverOverviewUseCase } from '../application/use-cases/get-caregiver-overview.use-case';
import { GetCaregiverPerformanceUseCase } from '../application/use-cases/get-caregiver-performance.use-case';
import {
  AddCaregiverDocumentUseCase,
  RecordCaregiverTrainingUseCase,
} from '../application/use-cases/manage-caregiver-documents.use-case';
import { RecordCaregiverReviewUseCase } from '../application/use-cases/record-caregiver-review.use-case';
import {
  AddCertificationUseCase,
  EditCertificationUseCase,
  RemoveCertificationUseCase,
} from '../application/use-cases/manage-certifications.use-case';
import { SetCaregiverHourlyRateUseCase } from '../application/use-cases/set-caregiver-hourly-rate.use-case';
import { GetCaregiverScheduleUseCase } from '../application/use-cases/get-caregiver-schedule.use-case';
import { ListCaregiversUseCase } from '../application/use-cases/list-caregivers.use-case';
import { SetCaregiverAvailabilityUseCase } from '../application/use-cases/set-caregiver-availability.use-case';
import { CaregiverDocumentsResponseDto } from './dto/caregiver-documents-response.dto';
import { CaregiverNotesResponseDto } from './dto/caregiver-notes-response.dto';
import { CaregiverPerformanceResponseDto } from './dto/caregiver-performance-response.dto';
import { CaregiverScheduleResponseDto } from './dto/caregiver-schedule-response.dto';
import {
  CaregiverListResponseDto,
  CaregiverOverviewResponseDto,
} from './dto/caregiver-response.dto';
import { CaregiverNotesQueryDto, CaregiversQueryDto } from './dto/caregivers-query.dto';
import {
  AddCaregiverDocumentDto,
  CaregiverAreasForGrowthDto,
  CaregiverEmergencyDto,
  CaregiverHourlyRateDto,
  CaregiverLanguagesDto,
  CaregiverNoteDto,
  CaregiverPersonalInfoDto,
  CaregiverPreferencesDto,
  CaregiverScheduleQueryDto,
  CaregiverSkillsDto,
  CaregiverStatusDto,
  CertificationDto,
  EditCaregiverProfileDto,
  RecordCaregiverReviewDto,
  RecordCaregiverTrainingDto,
  SetCaregiverAvailabilityDto,
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

function toDomainGender(value: string | undefined): CaregiverGender | null {
  if (value === undefined) {
    return null;
  }
  return Object.values(CaregiverGender).find((v) => String(v) === value) ?? null;
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
    private readonly getPerformance: GetCaregiverPerformanceUseCase,
    private readonly getDocuments: GetCaregiverDocumentsUseCase,
    private readonly getNotes: GetCaregiverNotesUseCase,
    private readonly editCaregiver: EditCaregiverUseCase,
    private readonly addNote: AddCaregiverNoteUseCase,
    private readonly deleteCaregiver: DeleteCaregiverUseCase,
    private readonly addCertification: AddCertificationUseCase,
    private readonly editCertification: EditCertificationUseCase,
    private readonly removeCertification: RemoveCertificationUseCase,
    private readonly editPersonalInfo: EditCaregiverPersonalInfoUseCase,
    private readonly setHourlyRate: SetCaregiverHourlyRateUseCase,
    private readonly setAvailability: SetCaregiverAvailabilityUseCase,
    private readonly recordReview: RecordCaregiverReviewUseCase,
    private readonly addDocument: AddCaregiverDocumentUseCase,
    private readonly recordTraining: RecordCaregiverTrainingUseCase,
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
  @ApiOperation({ summary: 'The caregiver Schedule tab for a week (default this week)' })
  @ApiOkResponse({ type: CaregiverScheduleResponseDto })
  async schedule(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: CaregiverScheduleQueryDto,
  ): Promise<CaregiverScheduleResponseDto> {
    const result = await this.getSchedule.execute({
      profileId: id,
      weekOf: query.weekOf === undefined ? null : new Date(query.weekOf),
    });
    return CaregiverScheduleResponseDto.fromResult(result);
  }

  @Get(':id/performance')
  @ApiOperation({ summary: 'The caregiver Performance tab' })
  @ApiOkResponse({ type: CaregiverPerformanceResponseDto })
  async performance(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CaregiverPerformanceResponseDto> {
    const result = await this.getPerformance.execute({ profileId: id });
    return CaregiverPerformanceResponseDto.fromResult(result);
  }

  @Get(':id/documents')
  @ApiOperation({ summary: 'The caregiver Documents tab' })
  @ApiOkResponse({ type: CaregiverDocumentsResponseDto })
  async documents(@Param('id', ParseUUIDPipe) id: string): Promise<CaregiverDocumentsResponseDto> {
    const result = await this.getDocuments.execute({ profileId: id });
    return CaregiverDocumentsResponseDto.fromResult(result);
  }

  @Get(':id/notes')
  @ApiOperation({ summary: 'The caregiver Notes tab (visit and office notes merged)' })
  @ApiOkResponse({ type: CaregiverNotesResponseDto })
  async notes(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: CaregiverNotesQueryDto,
  ): Promise<CaregiverNotesResponseDto> {
    const result = await this.getNotes.execute({
      profileId: id,
      type: query.type ?? null,
      search: query.search ?? null,
      from: query.from === undefined ? null : new Date(query.from),
      to: query.to === undefined ? null : new Date(query.to),
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 10,
    });
    return CaregiverNotesResponseDto.fromResult(result);
  }

  @Post(':id/documents')
  @ApiOperation({ summary: 'Add an employment document to a caregiver' })
  @ApiCreatedResponse()
  async addEmploymentDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: AddCaregiverDocumentDto,
  ): Promise<{ id: string }> {
    return this.addDocument.execute({
      profileId: id,
      name: body.name,
      category: body.category,
      status: body.status,
      documentDate: body.documentDate === undefined ? null : new Date(body.documentDate),
      file: {
        documentKey: body.documentKey ?? null,
        fileName: body.fileName ?? null,
        uploadedBy: body.uploadedBy ?? null,
      },
    });
  }

  @Post(':id/training')
  @ApiOperation({ summary: 'Record a training course for a caregiver' })
  @ApiCreatedResponse()
  async trainingRecord(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: RecordCaregiverTrainingDto,
  ): Promise<{ id: string }> {
    return this.recordTraining.execute({
      profileId: id,
      name: body.name,
      completedAt: body.completedAt === undefined ? null : new Date(body.completedAt),
      certificate: body.certificate ?? false,
      hoursCompleted: body.hoursCompleted ?? 0,
      hoursRequired: body.hoursRequired ?? null,
      file: {
        documentKey: body.documentKey ?? null,
        fileName: body.fileName ?? null,
        uploadedBy: body.uploadedBy ?? null,
      },
    });
  }

  @Put(':id/availability')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Set (replace) a caregiver's availability windows per day" })
  @ApiNoContentResponse()
  async editAvailability(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: SetCaregiverAvailabilityDto,
  ): Promise<void> {
    await this.setAvailability.execute({
      profileId: id,
      days: body.days.map((day) => ({ date: new Date(day.date), slots: day.slots })),
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

  @Put(':id/personal')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Edit a caregiver's personal information, writing through to the account",
  })
  @ApiNoContentResponse()
  async editPersonal(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: CaregiverPersonalInfoDto,
  ): Promise<void> {
    await this.editPersonalInfo.execute({
      profileId: id,
      firstName: body.firstName,
      lastName: body.lastName,
      phone: body.phone,
      email: body.email ?? null,
      dateOfBirth: body.dateOfBirth === undefined ? null : new Date(body.dateOfBirth),
      gender: toDomainGender(body.gender),
      addressLine1: body.addressLine1,
      city: body.city,
      state: body.state,
      postalCode: body.postalCode,
    });
  }

  @Put(':id/hourly-rate')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Set a caregiver's hourly pay rate" })
  @ApiNoContentResponse()
  async editHourlyRate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: CaregiverHourlyRateDto,
  ): Promise<void> {
    await this.setHourlyRate.execute({ profileId: id, hourlyRateMinor: body.hourlyRateMinor });
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

  @Put(':id/areas-for-growth')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Set the office flagged coaching areas for growth' })
  @ApiNoContentResponse()
  async editAreasForGrowth(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: CaregiverAreasForGrowthDto,
  ): Promise<void> {
    await this.editCaregiver.execute({
      profileId: id,
      section: 'AREAS_FOR_GROWTH',
      areasForGrowth: body.areasForGrowth,
    });
  }

  @Post(':id/reviews')
  @ApiOperation({ summary: 'Record a coordinator review of a caregiver' })
  @ApiCreatedResponse()
  async review(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: RecordCaregiverReviewDto,
    @CurrentAdmin() principal: AdminPrincipal,
  ): Promise<{ id: string }> {
    return this.recordReview.execute({
      profileId: id,
      adminId: principal.adminUserId,
      reviewerName: body.reviewerName ?? null,
      score: body.score,
      comment: body.comment ?? null,
      traits: body.traits ?? [],
      careRecipientId: body.careRecipientId ?? null,
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
      kind: body.kind ?? CaregiverNoteKind.Internal,
      authorName: body.authorName ?? null,
      authorRole: body.authorRole ?? null,
    });
  }

  @Post(':id/certifications')
  @ApiOperation({ summary: 'Add a certification to a caregiver' })
  @ApiCreatedResponse()
  async addCert(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: CertificationDto,
  ): Promise<{ id: string }> {
    return this.addCertification.execute({ profileId: id, ...toCertificationInput(body) });
  }

  @Put(':id/certifications/:certificationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Edit a certification of a caregiver' })
  @ApiNoContentResponse()
  async editCert(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('certificationId', ParseUUIDPipe) certificationId: string,
    @Body() body: CertificationDto,
  ): Promise<void> {
    await this.editCertification.execute({
      profileId: id,
      certificationId,
      ...toCertificationInput(body),
    });
  }

  @Delete(':id/certifications/:certificationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a certification from a caregiver' })
  @ApiNoContentResponse()
  async removeCert(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('certificationId', ParseUUIDPipe) certificationId: string,
  ): Promise<void> {
    await this.removeCertification.execute({ profileId: id, certificationId });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Archive a caregiver profile so it leaves the directory' })
  @ApiNoContentResponse()
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.deleteCaregiver.execute(id);
  }
}

function toCertificationInput(body: CertificationDto): {
  name: string;
  kind: CredentialKind | undefined;
  licenseNumber: string | null;
  issuedAt: Date | null;
  expiresAt: Date;
  document: { documentKey: string | null; fileName: string | null; uploadedBy: string | null };
} {
  return {
    name: body.name,
    kind: body.kind,
    licenseNumber: body.licenseNumber ?? null,
    issuedAt: body.issuedAt === undefined ? null : new Date(body.issuedAt),
    expiresAt: new Date(body.expiresAt),
    document: {
      documentKey: body.documentKey ?? null,
      fileName: body.fileName ?? null,
      uploadedBy: body.uploadedBy ?? null,
    },
  };
}
