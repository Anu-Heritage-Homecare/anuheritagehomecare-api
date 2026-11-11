import { ApiProperty } from '@nestjs/swagger';
import { Currency } from '@shared/domain/currency.enum';
import { AutoAssignAlgorithm } from '../../domain/auto-assign-algorithm.enum';
import { RateUnit } from '../../domain/rate-unit.enum';
import { CareOperationsResult } from '../../application/dto/care-operations.result';

class ServiceOfferingResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ nullable: true }) description!: string | null;
  @ApiProperty() isEnabled!: boolean;
  @ApiProperty() sortOrder!: number;
}

class VisitFormatRateResponseDto {
  @ApiProperty({ enum: Currency }) currency!: Currency;
  @ApiProperty() baseRateMinor!: number;
}

class VisitFormatResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ nullable: true }) description!: string | null;
  @ApiProperty({ nullable: true }) durationMinutes!: number | null;
  @ApiProperty({ enum: RateUnit }) rateUnit!: RateUnit;
  @ApiProperty() isActive!: boolean;
  @ApiProperty() sortOrder!: number;
  @ApiProperty({ type: [VisitFormatRateResponseDto] }) rates!: VisitFormatRateResponseDto[];
}

class SchedulingGuardrailsResponseDto {
  @ApiProperty() minimumNoticeHours!: number;
  @ApiProperty() travelBufferMinutes!: number;
  @ApiProperty() maxVisitsPerCaregiverPerDay!: number;
  @ApiProperty({ enum: AutoAssignAlgorithm }) autoAssignAlgorithm!: AutoAssignAlgorithm;
}

class TaskChecklistResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() taskCount!: number;
}

/** The whole Care Operations settings screen. */
export class CareOperationsResponseDto {
  @ApiProperty({ type: [ServiceOfferingResponseDto] })
  serviceOfferings!: ServiceOfferingResponseDto[];
  @ApiProperty({ type: [VisitFormatResponseDto] }) visitFormats!: VisitFormatResponseDto[];
  @ApiProperty({ type: SchedulingGuardrailsResponseDto })
  guardrails!: SchedulingGuardrailsResponseDto;
  @ApiProperty({ type: [TaskChecklistResponseDto] }) taskChecklists!: TaskChecklistResponseDto[];

  static fromResult(result: CareOperationsResult): CareOperationsResponseDto {
    return Object.assign(new CareOperationsResponseDto(), result);
  }
}
