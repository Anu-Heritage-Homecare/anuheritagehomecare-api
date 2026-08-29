import { ApiProperty } from '@nestjs/swagger';
import {
  MedicationAdministrationResult,
  VisitNotesResult,
  VisitObservationsResult,
  VisitPhotosResult,
  VisitTasksResult,
  VitalsReadingResult,
} from '../../application/dto/visit-care.result';
import { MedicationAdministrationOutcome } from '../../domain/medication-administration-outcome.enum';
import { NoteAudience } from '../../domain/note-audience.enum';

/** The recorded outcome for one medication on a visit. */
export class MedicationAdministrationResponseDto {
  @ApiProperty({ format: 'uuid' })
  medicationId!: string;

  @ApiProperty({
    enum: MedicationAdministrationOutcome,
    enumName: 'MedicationAdministrationOutcome',
  })
  outcome!: MedicationAdministrationOutcome;

  @ApiProperty({ nullable: true })
  note!: string | null;

  @ApiProperty()
  recordedAt!: string;

  static fromResult(result: MedicationAdministrationResult): MedicationAdministrationResponseDto {
    const dto = new MedicationAdministrationResponseDto();
    dto.medicationId = result.medicationId;
    dto.outcome = result.outcome;
    dto.note = result.note;
    dto.recordedAt = result.recordedAt;
    return dto;
  }
}

/** One set of vitals recorded during a visit. */
export class VitalsResponseDto {
  @ApiProperty({ nullable: true })
  systolic!: number | null;

  @ApiProperty({ nullable: true })
  diastolic!: number | null;

  @ApiProperty({ nullable: true })
  heartRate!: number | null;

  @ApiProperty({ nullable: true })
  oxygenSaturation!: number | null;

  @ApiProperty({ nullable: true })
  weightGrams!: number | null;

  @ApiProperty({ nullable: true, example: 36.8 })
  temperatureCelsius!: number | null;

  @ApiProperty()
  recordedAt!: string;

  static fromResult(result: VitalsReadingResult): VitalsResponseDto {
    const dto = new VitalsResponseDto();
    dto.systolic = result.systolic;
    dto.diastolic = result.diastolic;
    dto.heartRate = result.heartRate;
    dto.oxygenSaturation = result.oxygenSaturation;
    dto.weightGrams = result.weightGrams;
    dto.temperatureCelsius = result.temperatureCelsius;
    dto.recordedAt = result.recordedAt;
    return dto;
  }
}

/** The caregiver's qualitative observations for a visit. */
export class VisitObservationsResponseDto {
  @ApiProperty({ nullable: true, example: 'Good' })
  mood!: string | null;

  @ApiProperty({ nullable: true, example: 'Ate well' })
  appetite!: string | null;

  @ApiProperty({ nullable: true, example: 'Walked with walker' })
  mobility!: string | null;

  @ApiProperty({ nullable: true, example: 'All taken' })
  medicationStatus!: string | null;

  static fromResult(result: VisitObservationsResult): VisitObservationsResponseDto {
    const dto = new VisitObservationsResponseDto();
    dto.mood = result.mood;
    dto.appetite = result.appetite;
    dto.mobility = result.mobility;
    dto.medicationStatus = result.medicationStatus;
    return dto;
  }
}

class VisitNoteStateDto {
  @ApiProperty({ format: 'uuid', description: 'The caregiver who wrote the note' })
  authorId!: string;

  @ApiProperty({ enum: NoteAudience, enumName: 'NoteAudience' })
  audience!: string;

  @ApiProperty({ example: 'Mary was cheerful today.' })
  text!: string;

  @ApiProperty({ description: 'When the note was written (ISO 8601)' })
  createdAt!: string;
}

/** The notes feed on a visit, oldest first. */
export class VisitNotesResponseDto {
  @ApiProperty({ type: [VisitNoteStateDto] })
  notes!: VisitNoteStateDto[];

  static fromResult(result: VisitNotesResult): VisitNotesResponseDto {
    const dto = new VisitNotesResponseDto();
    dto.notes = result.notes.map((note) => ({ ...note }));
    return dto;
  }
}

/** The photo keys attached to a visit. */
export class VisitPhotosResponseDto {
  @ApiProperty({ type: [String] })
  photoKeys!: string[];

  static fromResult(result: VisitPhotosResult): VisitPhotosResponseDto {
    const dto = new VisitPhotosResponseDto();
    dto.photoKeys = result.photoKeys;
    return dto;
  }
}

/** A signed ticket for a direct client upload of one visit photo. */
export class PhotoUploadTicketResponseDto {
  @ApiProperty({ description: 'Where the client POSTs the multipart form' })
  uploadUrl!: string;

  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'string' },
    description: 'Form fields to send with the file (signature, api key, timestamp, public id)',
  })
  fields!: Record<string, string>;

  @ApiProperty({ description: 'The key to persist on the visit once the upload succeeds' })
  key!: string;

  static fromTicket(ticket: PhotoUploadTicketResponseDto): PhotoUploadTicketResponseDto {
    const dto = new PhotoUploadTicketResponseDto();
    dto.uploadUrl = ticket.uploadUrl;
    dto.fields = ticket.fields;
    dto.key = ticket.key;
    return dto;
  }
}

class VisitTaskStateDto {
  @ApiProperty()
  label!: string;

  @ApiProperty()
  completed!: boolean;

  @ApiProperty({ nullable: true, example: 15, description: 'How long the task took, in minutes' })
  durationMinutes!: number | null;
}

/** The checklist after a task completion change. */
export class VisitTasksResponseDto {
  @ApiProperty({ type: [VisitTaskStateDto] })
  tasks!: VisitTaskStateDto[];

  static fromResult(result: VisitTasksResult): VisitTasksResponseDto {
    const dto = new VisitTasksResponseDto();
    dto.tasks = result.tasks.map((task) => ({ ...task }));
    return dto;
  }
}
