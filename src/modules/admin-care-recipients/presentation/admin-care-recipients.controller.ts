import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
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
import { AddHealthEventUseCase } from '../application/use-cases/add-health-event.use-case';
import { AddMedicationUseCase } from '../application/use-cases/add-medication.use-case';
import { AssignCaregiverUseCase } from '../application/use-cases/assign-caregiver.use-case';
import { ChangeCareRecipientStatusUseCase } from '../application/use-cases/change-care-recipient-status.use-case';
import { CreateInvoiceUseCase } from '../application/use-cases/create-invoice.use-case';
import { DeleteDocumentUseCase } from '../application/use-cases/delete-document.use-case';
import { DiscontinueMedicationUseCase } from '../application/use-cases/discontinue-medication.use-case';
import { RecordInvoicePaymentUseCase } from '../application/use-cases/record-invoice-payment.use-case';
import { RemoveCaregiverUseCase } from '../application/use-cases/remove-caregiver.use-case';
import { ReviseCaregiverAssignmentUseCase } from '../application/use-cases/revise-caregiver-assignment.use-case';
import { SetBillingProfileUseCase } from '../application/use-cases/set-billing-profile.use-case';
import { SetCoverageUseCase } from '../application/use-cases/set-coverage.use-case';
import { GetCarePlanUseCase } from '../application/use-cases/get-care-plan.use-case';
import { GetCareRecipientProfileUseCase } from '../application/use-cases/get-care-recipient-profile.use-case';
import { GetRecipientBillingUseCase } from '../application/use-cases/get-recipient-billing.use-case';
import { GetRecipientCaregiversUseCase } from '../application/use-cases/get-recipient-caregivers.use-case';
import { GetRecipientDocumentsUseCase } from '../application/use-cases/get-recipient-documents.use-case';
import { GetRecipientHealthUseCase } from '../application/use-cases/get-recipient-health.use-case';
import { GetRecipientMedicationsUseCase } from '../application/use-cases/get-recipient-medications.use-case';
import { GetRecipientVisitsUseCase } from '../application/use-cases/get-recipient-visits.use-case';
import { ListCareRecipientsUseCase } from '../application/use-cases/list-care-recipients.use-case';
import { SetCarePlanGoalsUseCase } from '../application/use-cases/set-care-plan-goals.use-case';
import { SetCarePlanInstructionsUseCase } from '../application/use-cases/set-care-plan-instructions.use-case';
import { SetCarePlanScheduleUseCase } from '../application/use-cases/set-care-plan-schedule.use-case';
import { SetCareRecipientPriorityUseCase } from '../application/use-cases/set-care-recipient-priority.use-case';
import { SetDocumentStatusUseCase } from '../application/use-cases/set-document-status.use-case';
import { SetMedicationWarningsUseCase } from '../application/use-cases/set-medication-warnings.use-case';
import { UploadDocumentUseCase } from '../application/use-cases/upload-document.use-case';
import { SetPrimaryCaregiverUseCase } from '../application/use-cases/set-primary-caregiver.use-case';
import { UpdateMedicationUseCase } from '../application/use-cases/update-medication.use-case';
import { CarePlanResponseDto } from './dto/care-plan-response.dto';
import {
  DiscontinueMedicationRequestDto,
  MedicationRequestDto,
  SetMedicationWarningsRequestDto,
} from './dto/medication-write.dto';
import { AddHealthEventRequestDto } from './dto/add-health-event-request.dto';
import {
  AssignCaregiverRequestDto,
  RemoveCaregiverRequestDto,
  ReviseCaregiverAssignmentRequestDto,
  SetCoverageRequestDto,
} from './dto/care-team-write.dto';
import {
  CreateInvoiceRequestDto,
  RecordInvoicePaymentRequestDto,
  SetBillingProfileRequestDto,
} from './dto/billing-write.dto';
import { RecipientBillingResponseDto } from './dto/recipient-billing-response.dto';
import { RecipientCaregiversResponseDto } from './dto/recipient-caregivers-response.dto';
import { SetDocumentStatusRequestDto, UploadDocumentRequestDto } from './dto/document-write.dto';
import { RecipientDocumentsQueryDto } from './dto/recipient-documents-query.dto';
import { RecipientDocumentsResponseDto } from './dto/recipient-documents-response.dto';
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
    private readonly caregivers: GetRecipientCaregiversUseCase,
    private readonly documents: GetRecipientDocumentsUseCase,
    private readonly billing: GetRecipientBillingUseCase,
    private readonly createInvoice: CreateInvoiceUseCase,
    private readonly recordInvoicePayment: RecordInvoicePaymentUseCase,
    private readonly setBillingProfile: SetBillingProfileUseCase,
    private readonly uploadDocument: UploadDocumentUseCase,
    private readonly setDocumentStatus: SetDocumentStatusUseCase,
    private readonly deleteDocument: DeleteDocumentUseCase,
    private readonly assignTeamCaregiver: AssignCaregiverUseCase,
    private readonly reviseAssignment: ReviseCaregiverAssignmentUseCase,
    private readonly removeCaregiver: RemoveCaregiverUseCase,
    private readonly setCoverage: SetCoverageUseCase,
    private readonly addHealthEvent: AddHealthEventUseCase,
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

  @Get(':id/caregivers')
  @ApiOperation({
    summary: 'The caregivers tab: cards, care team, coverage grid and assignment history',
  })
  @ApiOkResponse({ type: RecipientCaregiversResponseDto })
  async getCaregivers(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<RecipientCaregiversResponseDto> {
    const result = await this.caregivers.execute(id);
    return RecipientCaregiversResponseDto.fromResult(result);
  }

  @Get(':id/documents')
  @ApiOperation({
    summary: 'The documents tab: cards, category counts, document list and recent activity',
  })
  @ApiOkResponse({ type: RecipientDocumentsResponseDto })
  async getDocuments(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: RecipientDocumentsQueryDto,
  ): Promise<RecipientDocumentsResponseDto> {
    const result = await this.documents.execute({
      recipientId: id,
      category: query.category ?? null,
      search: query.search ?? null,
      sortField: query.sort ?? 'DATE',
      sortDirection: query.direction ?? 'DESC',
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 10,
    });
    return RecipientDocumentsResponseDto.fromResult(result);
  }

  @Get(':id/billing')
  @ApiOperation({
    summary: 'The billing tab: cards, billing & insurance, invoices, breakdown and payments',
  })
  @ApiOkResponse({ type: RecipientBillingResponseDto })
  async getBilling(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
  ): Promise<RecipientBillingResponseDto> {
    const result = await this.billing.execute(id, page < 1 ? 1 : page);
    return RecipientBillingResponseDto.fromResult(result);
  }

  @Post(':id/invoices')
  @ApiOperation({ summary: 'Issue an invoice for a billing period (currency derived server side)' })
  @ApiCreatedResponse()
  async issueInvoice(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: CreateInvoiceRequestDto,
  ): Promise<{ id: string }> {
    return this.createInvoice.execute({
      recipientId: id,
      periodStart: new Date(body.periodStart),
      periodEnd: new Date(body.periodEnd),
      servicesLabel: body.servicesLabel,
      insuranceCoveredMinor: body.insuranceCoveredMinor,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      lines: body.lines.map((l) => ({ serviceName: l.serviceName, amountMinor: l.amountMinor })),
    });
  }

  @Post(':id/invoices/:invoiceId/payments')
  @ApiOperation({ summary: 'Record a payment received towards an invoice' })
  @ApiCreatedResponse()
  async addInvoicePayment(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('invoiceId', ParseUUIDPipe) invoiceId: string,
    @Body() body: RecordInvoicePaymentRequestDto,
  ): Promise<{ id: string }> {
    return this.recordInvoicePayment.execute({
      recipientId: id,
      invoiceId,
      amountMinor: body.amountMinor,
      methodLabel: body.methodLabel,
      receivedAt: body.receivedAt ? new Date(body.receivedAt) : null,
    });
  }

  @Put(':id/billing/profile')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set the billing and insurance profile' })
  async saveBillingProfile(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: SetBillingProfileRequestDto,
  ): Promise<{ id: string }> {
    return this.setBillingProfile.execute({ recipientId: id, ...body });
  }

  @Post(':id/documents')
  @ApiOperation({ summary: 'Register an uploaded document (metadata and storage key)' })
  @ApiCreatedResponse()
  async createDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UploadDocumentRequestDto,
  ): Promise<{ id: string }> {
    return this.uploadDocument.execute({
      recipientId: id,
      name: body.name,
      category: body.category,
      storageKey: body.storageKey,
      sizeBytes: body.sizeBytes,
      uploadedByName: body.uploadedByName,
      status: body.status,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
    });
  }

  @Put(':id/documents/:documentId/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change a document review status' })
  async changeDocumentStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Body() body: SetDocumentStatusRequestDto,
  ): Promise<{ id: string; status: string }> {
    return this.setDocumentStatus.execute({ recipientId: id, documentId, status: body.status });
  }

  @Delete(':id/documents/:documentId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a document from the registry' })
  async removeDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
  ): Promise<{ id: string }> {
    return this.deleteDocument.execute({ recipientId: id, documentId });
  }

  @Post(':id/caregivers')
  @ApiOperation({ summary: 'Assign a caregiver to the team (records assignment history)' })
  @ApiCreatedResponse()
  async createAssignment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: AssignCaregiverRequestDto,
    @CurrentAdmin() principal: AdminPrincipal,
  ): Promise<{ id: string }> {
    return this.assignTeamCaregiver.execute({
      recipientId: id,
      adminId: principal.adminUserId,
      caregiverId: body.caregiverId,
      role: body.role,
      specialization: body.specialization,
      scheduleLabel: body.scheduleLabel,
      reason: body.reason,
    });
  }

  // Declared before the ":assignmentId" route so "coverage" is not read as an id.
  @Put(':id/caregivers/coverage')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Replace the recurring weekly coverage grid' })
  async saveCoverage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: SetCoverageRequestDto,
  ): Promise<{ blockCount: number }> {
    return this.setCoverage.execute({
      recipientId: id,
      blocks: body.blocks.map((b) => ({
        weekday: b.weekday,
        slot: b.slot,
        caregiverId: b.caregiverId ?? null,
      })),
    });
  }

  @Put(':id/caregivers/:assignmentId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revise a care team assignment (role, specialization, schedule)' })
  async editAssignment(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
    @Body() body: ReviseCaregiverAssignmentRequestDto,
  ): Promise<{ id: string }> {
    return this.reviseAssignment.execute({
      recipientId: id,
      assignmentId,
      role: body.role,
      specialization: body.specialization,
      scheduleLabel: body.scheduleLabel,
    });
  }

  @Delete(':id/caregivers/:assignmentId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a caregiver from the team (records assignment history)' })
  async deleteAssignment(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
    @Body() body: RemoveCaregiverRequestDto,
    @CurrentAdmin() principal: AdminPrincipal,
  ): Promise<{ id: string }> {
    return this.removeCaregiver.execute({
      recipientId: id,
      assignmentId,
      adminId: principal.adminUserId,
      reason: body.reason,
    });
  }

  @Post(':id/health/events')
  @ApiOperation({ summary: 'Add a health event to the recipient timeline' })
  @ApiCreatedResponse()
  async createHealthEvent(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: AddHealthEventRequestDto,
    @CurrentAdmin() principal: AdminPrincipal,
  ): Promise<{ id: string }> {
    return this.addHealthEvent.execute({
      recipientId: id,
      adminId: principal.adminUserId,
      category: body.category,
      title: body.title,
      description: body.description,
      recordedByName: body.recordedByName ?? null,
      recordedByRole: body.recordedByRole ?? null,
      occurredAt: new Date(body.occurredAt),
    });
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
