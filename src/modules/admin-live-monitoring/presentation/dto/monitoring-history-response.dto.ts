import { ApiProperty } from '@nestjs/swagger';
import {
  CompletedVisitResult,
  PagedResult,
  PastAlertResult,
  PastIncidentResult,
} from '../../application/dto/monitoring-history.result';

class CompletedVisitDto implements CompletedVisitResult {
  @ApiProperty() id!: string;
  @ApiProperty() reference!: string;
  @ApiProperty() recipientName!: string;
  @ApiProperty({ nullable: true }) caregiverName!: string | null;
  @ApiProperty() dateLabel!: string;
  @ApiProperty() durationLabel!: string;
  @ApiProperty() status!: string;
  @ApiProperty() statusLabel!: string;
}

class PastAlertDto implements PastAlertResult {
  @ApiProperty() id!: string;
  @ApiProperty() type!: string;
  @ApiProperty() typeLabel!: string;
  @ApiProperty() severity!: string;
  @ApiProperty() description!: string;
  @ApiProperty() source!: string;
  @ApiProperty({ nullable: true }) branch!: string | null;
  @ApiProperty() dateLabel!: string;
  @ApiProperty() createdAt!: string;
  @ApiProperty() resolvedAt!: string;
  @ApiProperty() resolution!: string;
  @ApiProperty() statusLabel!: string;
}

class PastIncidentDto implements PastIncidentResult {
  @ApiProperty() id!: string;
  @ApiProperty() reference!: string;
  @ApiProperty() category!: string;
  @ApiProperty() categoryLabel!: string;
  @ApiProperty() severity!: string;
  @ApiProperty() reporter!: string;
  @ApiProperty() dateLabel!: string;
  @ApiProperty() createdAt!: string;
  @ApiProperty() resolvedAt!: string;
  @ApiProperty() outcome!: string;
}

/** A page of completed visits. */
export class CompletedVisitsPageDto implements PagedResult<CompletedVisitResult> {
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty() total!: number;
  @ApiProperty() totalPages!: number;
  @ApiProperty({ type: [CompletedVisitDto] }) rows!: CompletedVisitDto[];
  @ApiProperty() generatedAt!: string;

  static fromResult(result: PagedResult<CompletedVisitResult>): CompletedVisitsPageDto {
    return result;
  }
}

/** A page of past alerts. */
export class PastAlertsPageDto implements PagedResult<PastAlertResult> {
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty() total!: number;
  @ApiProperty() totalPages!: number;
  @ApiProperty({ type: [PastAlertDto] }) rows!: PastAlertDto[];
  @ApiProperty() generatedAt!: string;

  static fromResult(result: PagedResult<PastAlertResult>): PastAlertsPageDto {
    return result;
  }
}

/** A page of past incidents. */
export class PastIncidentsPageDto implements PagedResult<PastIncidentResult> {
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty() total!: number;
  @ApiProperty() totalPages!: number;
  @ApiProperty({ type: [PastIncidentDto] }) rows!: PastIncidentDto[];
  @ApiProperty() generatedAt!: string;

  static fromResult(result: PagedResult<PastIncidentResult>): PastIncidentsPageDto {
    return result;
  }
}
