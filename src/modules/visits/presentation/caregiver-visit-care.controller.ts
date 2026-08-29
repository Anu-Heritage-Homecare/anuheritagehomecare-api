import {
  Body,
  Controller,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ForbiddenDomainException } from '@shared/domain/domain-exception';
import { AuthenticatedPrincipal } from '@shared/presentation/authenticated-principal';
import { CurrentUser } from '@shared/presentation/current-user.decorator';
import { JwtAuthGuard } from '@shared/presentation/jwt-auth.guard';
import { UserType } from '@modules/identity/domain/user-type.enum';
import { RecordMedicationAdministrationUseCase } from '../application/use-cases/record-medication-administration.use-case';
import { RecordObservationsUseCase } from '../application/use-cases/record-observations.use-case';
import { RecordVitalsUseCase } from '../application/use-cases/record-vitals.use-case';
import { SaveVisitNotesUseCase } from '../application/use-cases/save-visit-notes.use-case';
import { SetTaskCompletionUseCase } from '../application/use-cases/set-task-completion.use-case';
import { RecordMedicationRequestDto } from './dto/record-medication-request.dto';
import { RecordObservationsRequestDto } from './dto/record-observations-request.dto';
import { RecordVitalsRequestDto } from './dto/record-vitals-request.dto';
import { SaveVisitNotesRequestDto } from './dto/save-visit-notes-request.dto';
import { SetTaskCompletionRequestDto } from './dto/set-task-completion-request.dto';
import {
  MedicationAdministrationResponseDto,
  VisitNotesResponseDto,
  VisitObservationsResponseDto,
  VisitTasksResponseDto,
  VitalsResponseDto,
} from './dto/visit-care-response.dto';

/**
 * Caregiver actions carried out during an active shift: recording medication
 * outcomes, vital signs, notes, and ticking off checklist tasks. Every route
 * requires a valid access token and is scoped to the authenticated caregiver, so
 * they can only act on their own visits. Controllers stay thin, translating HTTP
 * into use case calls and back to DTOs.
 */
@ApiTags('caregiver-schedule')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'caregiver/visits', version: '1' })
export class CaregiverVisitCareController {
  constructor(
    private readonly recordMedication: RecordMedicationAdministrationUseCase,
    private readonly recordVitals: RecordVitalsUseCase,
    private readonly recordObservations: RecordObservationsUseCase,
    private readonly saveNotes: SaveVisitNotesUseCase,
    private readonly setTaskCompletion: SetTaskCompletionUseCase,
  ) {}

  @Put(':id/medications/:medicationId')
  @ApiOperation({ summary: 'Record what was done with a scheduled medication' })
  @ApiOkResponse({ type: MedicationAdministrationResponseDto })
  async medication(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('medicationId', ParseUUIDPipe) medicationId: string,
    @Body() body: RecordMedicationRequestDto,
  ): Promise<MedicationAdministrationResponseDto> {
    this.assertCaregiver(principal);
    const result = await this.recordMedication.execute({
      caregiverId: principal.userId,
      visitId: id,
      medicationId,
      outcome: body.outcome,
      note: body.note,
    });
    return MedicationAdministrationResponseDto.fromResult(result);
  }

  @Put(':id/vitals')
  @ApiOperation({ summary: 'Record a set of vital signs during the visit' })
  @ApiOkResponse({ type: VitalsResponseDto })
  async vitals(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: RecordVitalsRequestDto,
  ): Promise<VitalsResponseDto> {
    this.assertCaregiver(principal);
    const result = await this.recordVitals.execute({
      caregiverId: principal.userId,
      visitId: id,
      systolic: body.systolic,
      diastolic: body.diastolic,
      heartRate: body.heartRate,
      oxygenSaturation: body.oxygenSaturation,
      weightGrams: body.weightGrams,
      temperatureCelsius: body.temperatureCelsius,
    });
    return VitalsResponseDto.fromResult(result);
  }

  @Put(':id/observations')
  @ApiOperation({
    summary: 'Record qualitative observations (mood, appetite, mobility, medication)',
  })
  @ApiOkResponse({ type: VisitObservationsResponseDto })
  async observations(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: RecordObservationsRequestDto,
  ): Promise<VisitObservationsResponseDto> {
    this.assertCaregiver(principal);
    const result = await this.recordObservations.execute({
      caregiverId: principal.userId,
      visitId: id,
      mood: body.mood,
      appetite: body.appetite,
      mobility: body.mobility,
      medicationStatus: body.medicationStatus,
    });
    return VisitObservationsResponseDto.fromResult(result);
  }

  @Put(':id/notes')
  @ApiOperation({ summary: 'Save the visit and family notes and photo keys' })
  @ApiOkResponse({ type: VisitNotesResponseDto })
  async notes(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: SaveVisitNotesRequestDto,
  ): Promise<VisitNotesResponseDto> {
    this.assertCaregiver(principal);
    const result = await this.saveNotes.execute({
      caregiverId: principal.userId,
      visitId: id,
      visitNote: body.visitNote,
      familyNote: body.familyNote,
      photoKeys: body.photoKeys,
    });
    return VisitNotesResponseDto.fromResult(result);
  }

  @Put(':id/tasks/:index')
  @ApiOperation({ summary: 'Mark a checklist task complete or not, by its position' })
  @ApiOkResponse({ type: VisitTasksResponseDto })
  async task(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('index', ParseIntPipe) index: number,
    @Body() body: SetTaskCompletionRequestDto,
  ): Promise<VisitTasksResponseDto> {
    this.assertCaregiver(principal);
    const result = await this.setTaskCompletion.execute({
      caregiverId: principal.userId,
      visitId: id,
      taskIndex: index,
      completed: body.completed,
    });
    return VisitTasksResponseDto.fromResult(result);
  }

  private assertCaregiver(principal: AuthenticatedPrincipal): void {
    if (principal.userType !== String(UserType.Caregiver)) {
      throw new ForbiddenDomainException('Only caregivers can act on a visit');
    }
  }
}
