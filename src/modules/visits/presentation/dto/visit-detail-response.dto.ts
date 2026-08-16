import { ApiProperty } from '@nestjs/swagger';
import { VisitDetailResult } from '../../application/dto/visit-detail.result';
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
    dto.address = result.address;
    dto.recipient = { ...result.recipient };
    dto.tasks = result.tasks.map((task) => ({ ...task }));
    dto.specialInstructions = result.specialInstructions;
    dto.healthNote = { ...result.healthNote };
    dto.emergencyContact = result.emergencyContact === null ? null : { ...result.emergencyContact };
    return dto;
  }
}
