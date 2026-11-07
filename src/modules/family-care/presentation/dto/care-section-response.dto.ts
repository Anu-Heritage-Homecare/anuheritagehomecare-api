import { ApiProperty } from '@nestjs/swagger';
import {
  CareOverviewResult,
  CarePlanResult,
  RecipientHealthResult,
} from '../../application/dto/care-section.result';

/** The recipient card shown at the top of the Care Overview. */
class CareOverviewRecipientDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() gender!: string;
  @ApiProperty() age!: number;
  @ApiProperty({ nullable: true, type: String }) photoKey!: string | null;
}

/** A minimal person reference (id and display name). */
class CareRefDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
}

/** A completed/total count pair. */
class CountPairDto {
  @ApiProperty() completed!: number;
  @ApiProperty() total!: number;
}

/** The at a glance counts on the Care Overview. */
class CareOverviewSummaryDto {
  @ApiProperty({ type: CountPairDto }) tasks!: CountPairDto;
  @ApiProperty({ type: CountPairDto }) medications!: CountPairDto;
  @ApiProperty() hasVitals!: boolean;
  @ApiProperty() notesCount!: number;
  @ApiProperty() photosCount!: number;
}

/** The family owner's Care Overview for a recipient. */
export class CareOverviewResponseDto {
  @ApiProperty({ type: CareOverviewRecipientDto })
  recipient!: CareOverviewRecipientDto;

  @ApiProperty({ nullable: true, example: 'Standard Care' })
  carePlanName!: string | null;

  @ApiProperty({ type: CareRefDto, nullable: true, description: 'The caregiver on today’s visit' })
  caregiver!: CareRefDto | null;

  @ApiProperty({ nullable: true, format: 'uuid' })
  currentVisitId!: string | null;

  @ApiProperty({ type: CareOverviewSummaryDto })
  summary!: CareOverviewSummaryDto;

  static fromResult(result: CareOverviewResult): CareOverviewResponseDto {
    return Object.assign(new CareOverviewResponseDto(), result);
  }
}

/** A blood pressure reading, classified NORMAL or ATTENTION. */
class BloodPressureValueDto {
  @ApiProperty({ example: 120 }) systolic!: number;
  @ApiProperty({ example: 80 }) diastolic!: number;
}

class BloodPressureStatusDto {
  @ApiProperty({ type: BloodPressureValueDto }) value!: BloodPressureValueDto;
  @ApiProperty({ enum: ['NORMAL', 'ATTENTION'] }) status!: string;
}

/** A single numeric vital (heart rate, temperature, oxygen), classified. */
class NumericVitalStatusDto {
  @ApiProperty() value!: number;
  @ApiProperty({ enum: ['NORMAL', 'ATTENTION'] }) status!: string;
}

/** Latest vitals, each classified NORMAL or ATTENTION (null when not taken). */
class HealthVitalsDto {
  @ApiProperty({ type: BloodPressureStatusDto, nullable: true })
  bloodPressure!: BloodPressureStatusDto | null;

  @ApiProperty({ type: NumericVitalStatusDto, nullable: true })
  heartRate!: NumericVitalStatusDto | null;

  @ApiProperty({ type: NumericVitalStatusDto, nullable: true })
  temperatureCelsius!: NumericVitalStatusDto | null;

  @ApiProperty({ type: NumericVitalStatusDto, nullable: true })
  oxygenSaturation!: NumericVitalStatusDto | null;
}

/** Caregiver observations recorded on today's visit. */
class HealthObservationDto {
  @ApiProperty({ nullable: true, type: String }) mood!: string | null;
  @ApiProperty({ nullable: true, type: String }) appetite!: string | null;
  @ApiProperty({ nullable: true, type: String }) mobility!: string | null;
  @ApiProperty({ nullable: true, type: String }) medicationStatus!: string | null;
}

/** Today's health snapshot for a recipient. */
export class RecipientHealthResponseDto {
  @ApiProperty({ nullable: true })
  recordedAt!: string | null;

  @ApiProperty({ type: HealthVitalsDto })
  vitals!: HealthVitalsDto;

  @ApiProperty({ type: HealthObservationDto })
  observation!: HealthObservationDto;

  static fromResult(result: RecipientHealthResult): RecipientHealthResponseDto {
    return Object.assign(new RecipientHealthResponseDto(), result);
  }
}

/** A single care goal and whether it has been achieved. */
class CareGoalDto {
  @ApiProperty() label!: string;
  @ApiProperty() achieved!: boolean;
}

/** The visit schedule, from the care schedule. */
class CarePlanScheduleDto {
  @ApiProperty() frequency!: string;
  @ApiProperty({ example: '2026-11-12' }) startDate!: string;
  @ApiProperty() expectedDuration!: string;
  @ApiProperty({ type: [String] }) days!: string[];
  @ApiProperty({ nullable: true, type: String }) startTime!: string | null;
  @ApiProperty({ nullable: true, type: Number }) visitDurationHours!: number | null;
}

/** Primary, backup and coordinator caregivers (office set; null until assigned). */
class CarePlanCaregiversDto {
  @ApiProperty({ type: CareRefDto, nullable: true }) primary!: CareRefDto | null;
  @ApiProperty({ type: CareRefDto, nullable: true }) backup!: CareRefDto | null;
  @ApiProperty({ type: CareRefDto, nullable: true }) coordinator!: CareRefDto | null;
}

/** The recipient's care plan. */
export class RecipientCarePlanResponseDto {
  @ApiProperty({ nullable: true, example: 'Standard Care' })
  planName!: string | null;

  @ApiProperty({
    type: [CareGoalDto],
    description: 'Care goals set by the office (empty when none are set)',
  })
  goals!: CareGoalDto[];

  @ApiProperty({ type: [String], description: 'Services included, from the care needs' })
  services!: string[];

  @ApiProperty({
    type: CarePlanScheduleDto,
    nullable: true,
    description: 'The visit schedule from the care schedule',
  })
  schedule!: CarePlanScheduleDto | null;

  @ApiProperty({
    type: CarePlanCaregiversDto,
    description: 'Primary, backup and coordinator (office set; null until available)',
  })
  caregivers!: CarePlanCaregiversDto;

  @ApiProperty({ nullable: true })
  careInstructions!: string | null;

  static fromResult(result: CarePlanResult): RecipientCarePlanResponseDto {
    return Object.assign(new RecipientCarePlanResponseDto(), result);
  }
}
