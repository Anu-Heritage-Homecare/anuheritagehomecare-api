import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CareRecipientResult } from '../../application/dto/care-recipient.result';
import { CareFrequency } from '../../domain/care-frequency.enum';
import { CareNeed } from '../../domain/care-need.enum';
import { CareRecipientStatus } from '../../domain/care-recipient-status.enum';
import { Gender } from '../../domain/gender.enum';
import { OnboardingStep } from '../../domain/onboarding-step.enum';

class MedicationResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Metformin' })
  name!: string;

  @ApiProperty({ nullable: true, example: '500 mg' })
  dose!: string | null;

  @ApiProperty({ nullable: true, example: 510, description: 'Minutes from midnight' })
  scheduleMinute!: number | null;
}

class CareRecipientHealthDto {
  @ApiProperty({ isArray: true, type: String })
  medicalConditions!: string[];

  @ApiProperty({ isArray: true, type: String })
  allergies!: string[];

  @ApiProperty()
  needsMedicationHelp!: boolean;

  @ApiProperty({ type: [MedicationResponseDto] })
  medications!: MedicationResponseDto[];
}

class CareRecipientScheduleDto {
  @ApiProperty({ enum: CareFrequency, enumName: 'CareFrequency' })
  frequency!: CareFrequency;

  @ApiProperty({ example: '2026-08-20' })
  estimatedStartDate!: string;

  @ApiProperty()
  expectedDuration!: string;

  @ApiProperty({ type: String, isArray: true, example: ['MONDAY', 'WEDNESDAY', 'FRIDAY'] })
  days!: string[];

  @ApiProperty({ nullable: true, example: 540 })
  startMinute!: number | null;

  @ApiProperty({ nullable: true, example: 180 })
  visitDurationMinutes!: number | null;
}

/**
 * HTTP response contract for a care recipient. `nextStep` tells the mobile app
 * which onboarding screen to resume at if the family owner returns mid flow.
 */
export class CareRecipientResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  ownerId!: string;

  @ApiProperty({ enum: CareRecipientStatus, enumName: 'CareRecipientStatus' })
  status!: CareRecipientStatus;

  @ApiProperty({
    enum: OnboardingStep,
    enumName: 'OnboardingStep',
    description: 'The wizard step to resume at',
  })
  nextStep!: OnboardingStep;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: Gender, enumName: 'Gender' })
  gender!: Gender;

  @ApiProperty({ example: '1950-04-20' })
  dateOfBirth!: string;

  @ApiProperty()
  city!: string;

  @ApiProperty()
  state!: string;

  @ApiProperty()
  fullAddress!: string;

  @ApiProperty()
  relationship!: string;

  @ApiProperty()
  livingSituation!: string;

  @ApiPropertyOptional({ nullable: true })
  photoKey!: string | null;

  @ApiPropertyOptional({ nullable: true, example: 37.3861 })
  latitude!: number | null;

  @ApiPropertyOptional({ nullable: true, example: -122.0839 })
  longitude!: number | null;

  @ApiProperty({ isArray: true, enum: CareNeed, enumName: 'CareNeed' })
  careNeeds!: CareNeed[];

  @ApiPropertyOptional({ type: CareRecipientHealthDto, nullable: true })
  health!: CareRecipientHealthDto | null;

  @ApiPropertyOptional({ type: CareRecipientScheduleDto, nullable: true })
  schedule!: CareRecipientScheduleDto | null;

  @ApiPropertyOptional({ nullable: true })
  completedAt!: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;

  static fromResult(result: CareRecipientResult): CareRecipientResponseDto {
    const dto = new CareRecipientResponseDto();
    dto.id = result.id;
    dto.ownerId = result.ownerId;
    dto.status = result.status;
    dto.nextStep = result.nextStep;
    dto.name = result.name;
    dto.gender = result.gender;
    dto.dateOfBirth = result.dateOfBirth;
    dto.city = result.city;
    dto.state = result.state;
    dto.fullAddress = result.fullAddress;
    dto.relationship = result.relationship;
    dto.livingSituation = result.livingSituation;
    dto.photoKey = result.photoKey;
    dto.latitude = result.latitude;
    dto.longitude = result.longitude;
    dto.careNeeds = result.careNeeds;
    dto.health = result.health;
    dto.schedule = result.schedule;
    dto.completedAt = result.completedAt;
    dto.createdAt = result.createdAt;
    dto.updatedAt = result.updatedAt;
    return dto;
  }
}
