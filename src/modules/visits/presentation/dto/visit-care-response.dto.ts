import { ApiProperty } from '@nestjs/swagger';
import {
  MedicationAdministrationResult,
  VisitNotesResult,
  VisitObservationsResult,
  VisitTasksResult,
  VitalsReadingResult,
} from '../../application/dto/visit-care.result';
import { MedicationAdministrationOutcome } from '../../domain/medication-administration-outcome.enum';

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

/** The notes and photo keys saved on a visit. */
export class VisitNotesResponseDto {
  @ApiProperty({ nullable: true })
  visitNote!: string | null;

  @ApiProperty({ nullable: true })
  familyNote!: string | null;

  @ApiProperty({ type: [String] })
  photoKeys!: string[];

  static fromResult(result: VisitNotesResult): VisitNotesResponseDto {
    const dto = new VisitNotesResponseDto();
    dto.visitNote = result.visitNote;
    dto.familyNote = result.familyNote;
    dto.photoKeys = result.photoKeys;
    return dto;
  }
}

class VisitTaskStateDto {
  @ApiProperty()
  label!: string;

  @ApiProperty()
  completed!: boolean;
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
