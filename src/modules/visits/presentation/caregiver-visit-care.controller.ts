import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
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
import { ForbiddenDomainException } from '@shared/domain/domain-exception';
import { AuthenticatedPrincipal } from '@shared/presentation/authenticated-principal';
import { CurrentUser } from '@shared/presentation/current-user.decorator';
import { JwtAuthGuard } from '@shared/presentation/jwt-auth.guard';
import { UserType } from '@modules/identity/domain/user-type.enum';
import { NoteAudience } from '../domain/note-audience.enum';
import { AddVisitNoteUseCase } from '../application/use-cases/add-visit-note.use-case';
import { CreatePhotoUploadTicketUseCase } from '../application/use-cases/create-photo-upload-ticket.use-case';
import { RecordMedicationAdministrationUseCase } from '../application/use-cases/record-medication-administration.use-case';
import { RecordObservationsUseCase } from '../application/use-cases/record-observations.use-case';
import { RecordVitalsUseCase } from '../application/use-cases/record-vitals.use-case';
import { SaveVisitPhotosUseCase } from '../application/use-cases/save-visit-photos.use-case';
import { SetTaskCompletionUseCase } from '../application/use-cases/set-task-completion.use-case';
import { AddVisitNoteRequestDto } from './dto/add-visit-note-request.dto';
import { RecordMedicationRequestDto } from './dto/record-medication-request.dto';
import { RecordObservationsRequestDto } from './dto/record-observations-request.dto';
import { RecordVitalsRequestDto } from './dto/record-vitals-request.dto';
import { SaveVisitPhotosRequestDto } from './dto/save-visit-photos-request.dto';
import { SetTaskCompletionRequestDto } from './dto/set-task-completion-request.dto';
import {
  MedicationAdministrationResponseDto,
  PhotoUploadTicketResponseDto,
  VisitNotesResponseDto,
  VisitObservationsResponseDto,
  VisitPhotosResponseDto,
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
    private readonly addNote: AddVisitNoteUseCase,
    private readonly savePhotos: SaveVisitPhotosUseCase,
    private readonly createPhotoUploadTicket: CreatePhotoUploadTicketUseCase,
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

  @Post(':id/notes')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a note to the visit notes feed' })
  @ApiCreatedResponse({ type: VisitNotesResponseDto })
  async addVisitNote(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: AddVisitNoteRequestDto,
  ): Promise<VisitNotesResponseDto> {
    this.assertCaregiver(principal);
    const result = await this.addNote.execute({
      caregiverId: principal.userId,
      visitId: id,
      audience: body.audience ?? NoteAudience.Family,
      text: body.text,
    });
    return VisitNotesResponseDto.fromResult(result);
  }

  @Post(':id/photos/upload-ticket')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Issue a signed ticket to upload a visit photo to the store' })
  @ApiCreatedResponse({ type: PhotoUploadTicketResponseDto })
  async photoUploadTicket(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PhotoUploadTicketResponseDto> {
    this.assertCaregiver(principal);
    const ticket = await this.createPhotoUploadTicket.execute({
      caregiverId: principal.userId,
      visitId: id,
    });
    return PhotoUploadTicketResponseDto.fromTicket(ticket);
  }

  @Put(':id/photos')
  @ApiOperation({ summary: 'Set the photo keys attached to the visit' })
  @ApiOkResponse({ type: VisitPhotosResponseDto })
  async photos(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: SaveVisitPhotosRequestDto,
  ): Promise<VisitPhotosResponseDto> {
    this.assertCaregiver(principal);
    const result = await this.savePhotos.execute({
      caregiverId: principal.userId,
      visitId: id,
      photoKeys: body.photoKeys,
    });
    return VisitPhotosResponseDto.fromResult(result);
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
      durationMinutes: body.durationMinutes,
    });
    return VisitTasksResponseDto.fromResult(result);
  }

  private assertCaregiver(principal: AuthenticatedPrincipal): void {
    if (principal.userType !== String(UserType.Caregiver)) {
      throw new ForbiddenDomainException('Only caregivers can act on a visit');
    }
  }
}
