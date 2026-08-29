import { ApiProperty } from '@nestjs/swagger';
import { VisitDetailResult } from '../../application/dto/visit-detail.result';
import { MedicationAdministrationOutcome } from '../../domain/medication-administration-outcome.enum';
import { VisitStatus } from '../../domain/visit-status.enum';
import { minutesToClock } from './time-format';

class DetailRecipientDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ example: 'FEMALE' })
  gender!: string;

  @ApiProperty({ example: 82 })
  age!: number;

  @ApiProperty({ nullable: true })
  photoKey!: string | null;
}

class VisitTaskDto {
  @ApiProperty({ example: 'Blood Pressure' })
  label!: string;

  @ApiProperty()
  completed!: boolean;
}

class HealthNoteDto {
  @ApiProperty({ type: [String], example: ['Diabetes', 'High Fall Risk'] })
  medicalConditions!: string[];

  @ApiProperty({ type: [String], example: ['Penicillin Allergy'] })
  allergies!: string[];
}

class MedicationAdministrationDto {
  @ApiProperty({
    enum: MedicationAdministrationOutcome,
    enumName: 'MedicationAdministrationOutcome',
  })
  outcome!: MedicationAdministrationOutcome;

  @ApiProperty({ nullable: true, example: 'Patient refused' })
  note!: string | null;

  @ApiProperty()
  recordedAt!: string;
}

class VisitMedicationDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Metformin' })
  name!: string;

  @ApiProperty({ nullable: true, example: '500 mg' })
  dose!: string | null;

  @ApiProperty({ nullable: true, example: 510, description: 'Minutes from midnight' })
  scheduleMinute!: number | null;

  @ApiProperty({
    type: MedicationAdministrationDto,
    nullable: true,
    description: 'The outcome recorded on this visit, or null if not yet recorded',
  })
  administration!: MedicationAdministrationDto | null;
}

class VisitVitalsDto {
  @ApiProperty({ nullable: true, example: 120 })
  systolic!: number | null;

  @ApiProperty({ nullable: true, example: 80 })
  diastolic!: number | null;

  @ApiProperty({ nullable: true, example: 72 })
  heartRate!: number | null;

  @ApiProperty({ nullable: true, example: 98 })
  oxygenSaturation!: number | null;

  @ApiProperty({ nullable: true, example: 98000, description: 'Weight in whole grams' })
  weightGrams!: number | null;

  @ApiProperty({ nullable: true, example: 36.8 })
  temperatureCelsius!: number | null;

  @ApiProperty()
  recordedAt!: string;
}

class VisitObservationDto {
  @ApiProperty({ nullable: true, example: 'Good' })
  mood!: string | null;

  @ApiProperty({ nullable: true, example: 'Ate well' })
  appetite!: string | null;

  @ApiProperty({ nullable: true, example: 'Walked with walker' })
  mobility!: string | null;

  @ApiProperty({ nullable: true, example: 'All taken' })
  medicationStatus!: string | null;
}

class VisitNoteDto {
  @ApiProperty({ format: 'uuid' })
  authorId!: string;

  @ApiProperty({ example: 'FAMILY' })
  audience!: string;

  @ApiProperty({ example: 'Mary was cheerful today.' })
  text!: string;

  @ApiProperty()
  createdAt!: string;
}

class EmergencyContactDto {
  @ApiProperty({ example: 'Sarah Adams John' })
  name!: string;

  @ApiProperty({ example: '+14155550100' })
  phone!: string;
}

/** The full appointment detail for one visit. */
export class VisitDetailResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: VisitStatus, enumName: 'VisitStatus' })
  status!: VisitStatus;

  @ApiProperty({ example: '2026-07-12' })
  date!: string;

  @ApiProperty({ example: '09:00' })
  startTime!: string;

  @ApiProperty({ example: '14:00' })
  endTime!: string;

  @ApiProperty({ nullable: true, description: 'Server stamped clock in time', example: null })
  clockInAt!: string | null;

  @ApiProperty({ nullable: true, description: 'Server stamped clock out time', example: null })
  clockOutAt!: string | null;

  @ApiProperty({ example: 0, description: 'Total whole seconds spent on closed breaks' })
  breakSeconds!: number;

  @ApiProperty({
    nullable: true,
    description: 'When the current open break began, or null if not on break',
    example: null,
  })
  onBreakSince!: string | null;

  @ApiProperty({ example: '123 Maple Street, Sunnyvale, CA 94086' })
  address!: string;

  @ApiProperty({ type: DetailRecipientDto })
  recipient!: DetailRecipientDto;

  @ApiProperty({ type: [VisitTaskDto] })
  tasks!: VisitTaskDto[];

  @ApiProperty({ type: [String], example: ['Gate Code: 2456', 'Patient has a small dog'] })
  specialInstructions!: string[];

  @ApiProperty({ type: HealthNoteDto })
  healthNote!: HealthNoteDto;

  @ApiProperty({ type: [VisitMedicationDto] })
  medications!: VisitMedicationDto[];

  @ApiProperty({ type: [VisitVitalsDto], description: 'Recorded vitals, oldest first' })
  vitals!: VisitVitalsDto[];

  @ApiProperty({ type: VisitObservationDto })
  observation!: VisitObservationDto;

  @ApiProperty({ type: [VisitNoteDto], description: 'The notes feed, oldest first' })
  notes!: VisitNoteDto[];

  @ApiProperty({ type: [String] })
  photoKeys!: string[];

  @ApiProperty({ type: EmergencyContactDto, nullable: true })
  emergencyContact!: EmergencyContactDto | null;

  static fromResult(result: VisitDetailResult): VisitDetailResponseDto {
    const dto = new VisitDetailResponseDto();
    dto.id = result.id;
    dto.status = result.status;
    dto.date = result.date;
    dto.startTime = minutesToClock(result.startMinute);
    dto.endTime = minutesToClock(result.endMinute);
    dto.clockInAt = result.clockInAt;
    dto.clockOutAt = result.clockOutAt;
    dto.breakSeconds = result.breakSeconds;
    dto.onBreakSince = result.onBreakSince;
    dto.address = result.address;
    dto.recipient = { ...result.recipient };
    dto.tasks = result.tasks.map((task) => ({ ...task }));
    dto.specialInstructions = result.specialInstructions;
    dto.healthNote = { ...result.healthNote };
    dto.medications = result.medications.map((medication) => ({
      ...medication,
      administration: medication.administration === null ? null : { ...medication.administration },
    }));
    dto.vitals = result.vitals.map((reading) => ({ ...reading }));
    dto.observation = { ...result.observation };
    dto.notes = result.notes.map((note) => ({ ...note }));
    dto.photoKeys = result.photoKeys;
    dto.emergencyContact = result.emergencyContact === null ? null : { ...result.emergencyContact };
    return dto;
  }
}
