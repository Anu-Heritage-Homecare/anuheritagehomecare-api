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

  @ApiProperty({ description: 'Care goals set by the office (empty when none are set)' })
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
