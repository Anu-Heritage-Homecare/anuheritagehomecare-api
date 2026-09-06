import { ApiProperty } from '@nestjs/swagger';
import { AlertResult } from '../../application/dto/alert.result';
import { AlertSeverity } from '../../domain/alert-severity.enum';
import { AlertStatus } from '../../domain/alert-status.enum';
import { AlertType } from '../../domain/alert-type.enum';

export class AlertResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: AlertType })
  type!: AlertType;

  @ApiProperty({ enum: AlertSeverity })
  severity!: AlertSeverity;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty({ nullable: true })
  coordinatorName!: string | null;

  @ApiProperty({ enum: AlertStatus })
  status!: AlertStatus;

  @ApiProperty({ nullable: true })
  relatedVisitId!: string | null;

  @ApiProperty({ nullable: true })
  relatedCaregiverId!: string | null;

  @ApiProperty({ nullable: true })
  relatedCareRecipientId!: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: string;

  static fromResult(result: AlertResult): AlertResponseDto {
    const dto = new AlertResponseDto();
    dto.id = result.id;
    dto.type = result.type;
    dto.severity = result.severity;
    dto.title = result.title;
    dto.description = result.description;
    dto.coordinatorName = result.coordinatorName;
    dto.status = result.status;
    dto.relatedVisitId = result.relatedVisitId;
    dto.relatedCaregiverId = result.relatedCaregiverId;
    dto.relatedCareRecipientId = result.relatedCareRecipientId;
    dto.createdAt = result.createdAt.toISOString();
    return dto;
  }
}

export class AlertListResponseDto {
  @ApiProperty({ type: [AlertResponseDto] })
  alerts!: AlertResponseDto[];

  static fromResults(results: AlertResult[]): AlertListResponseDto {
    const dto = new AlertListResponseDto();
    dto.alerts = results.map((result) => AlertResponseDto.fromResult(result));
    return dto;
  }
}
