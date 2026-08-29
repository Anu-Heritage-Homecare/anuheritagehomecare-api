import { ApiProperty } from '@nestjs/swagger';
import {
  CareOverviewResult,
  CarePlanResult,
  RecipientHealthResult,
} from '../../application/dto/care-section.result';

/** The family owner's Care Overview for a recipient. */
export class CareOverviewResponseDto {
  @ApiProperty({ description: 'The recipient card (id, name, gender, age, photoKey)' })
  recipient!: CareOverviewResult['recipient'];

  @ApiProperty({ nullable: true, example: 'Standard Care' })
  carePlanName!: string | null;

  @ApiProperty({ nullable: true, description: 'The caregiver on today’s visit' })
  caregiver!: CareOverviewResult['caregiver'];

  @ApiProperty({ nullable: true, format: 'uuid' })
  currentVisitId!: string | null;

  @ApiProperty({ description: 'Counts for the overview list (tasks, medications, notes, photos)' })
  summary!: CareOverviewResult['summary'];

  static fromResult(result: CareOverviewResult): CareOverviewResponseDto {
    return Object.assign(new CareOverviewResponseDto(), result);
  }
}

/** Today's health snapshot for a recipient. */
export class RecipientHealthResponseDto {
  @ApiProperty({ nullable: true })
  recordedAt!: string | null;

  @ApiProperty({ description: 'Latest vitals, each classified NORMAL or ATTENTION' })
  vitals!: RecipientHealthResult['vitals'];

  @ApiProperty({ description: 'Caregiver observations (mood, appetite, mobility, medication)' })
  observation!: RecipientHealthResult['observation'];

  static fromResult(result: RecipientHealthResult): RecipientHealthResponseDto {
    return Object.assign(new RecipientHealthResponseDto(), result);
  }
}

/** The recipient's care plan. */
export class CarePlanResponseDto {
  @ApiProperty({ nullable: true, example: 'Standard Care' })
  planName!: string | null;

  @ApiProperty({ description: 'Care goals (office set; empty until the admin surface exists)' })
  goals!: CarePlanResult['goals'];

  @ApiProperty({ type: [String], description: 'Services included, from the care needs' })
  services!: string[];

  @ApiProperty({ nullable: true, description: 'The visit schedule from the care schedule' })
  schedule!: CarePlanResult['schedule'];

  @ApiProperty({
    description: 'Primary, backup and coordinator (office set; null until available)',
  })
  caregivers!: CarePlanResult['caregivers'];

  @ApiProperty({ nullable: true })
  careInstructions!: string | null;

  static fromResult(result: CarePlanResult): CarePlanResponseDto {
    return Object.assign(new CarePlanResponseDto(), result);
  }
}
