import { ApiProperty } from '@nestjs/swagger';
import {
  LiveActiveVisitResult,
  LiveActivityResult,
  LiveAttentionResult,
  LiveMapResult,
  LiveOverviewResult,
  LiveSummaryResult,
  LiveVisitPageResult,
} from '../../application/dto/live-monitoring.result';

class SummaryDto implements LiveSummaryResult {
  @ApiProperty() activeVisits!: number;
  @ApiProperty() caregiversCheckedIn!: number;
  @ApiProperty() checkInDue!: number;
  @ApiProperty() runningLate!: number;
  @ApiProperty() attentionRequired!: number;
  @ApiProperty() criticalAlerts!: number;
}

class TabCountsDto {
  @ApiProperty() activeVisits!: number;
  @ApiProperty() attention!: number;
}

class ActiveVisitDto implements LiveActiveVisitResult {
  @ApiProperty() visitId!: string;
  @ApiProperty() recipientName!: string;
  @ApiProperty({ nullable: true, type: String }) caregiverName!: string | null;
  @ApiProperty() service!: string;
  @ApiProperty() status!: string;
  @ApiProperty() elapsedMinutes!: number;
  @ApiProperty() elapsedLabel!: string;
  @ApiProperty() progressPercent!: number;
}

class AttentionDto implements LiveAttentionResult {
  @ApiProperty() id!: string;
  @ApiProperty() source!: string;
  @ApiProperty() issueType!: string;
  @ApiProperty() description!: string;
  @ApiProperty() priority!: string;
  @ApiProperty() timeLabel!: string;
  @ApiProperty({ nullable: true, type: String }) recipientName!: string | null;
  @ApiProperty({ nullable: true, type: String }) caregiverName!: string | null;
  @ApiProperty({ nullable: true, type: String }) visitId!: string | null;
  @ApiProperty() primaryAction!: string;
  @ApiProperty() secondaryAction!: string;
}

class ActivityDto implements LiveActivityResult {
  @ApiProperty() type!: string;
  @ApiProperty() title!: string;
  @ApiProperty() description!: string;
  @ApiProperty() at!: string;
  @ApiProperty() timeLabel!: string;
}

/** The Live Monitoring overview response. */
export class LiveOverviewResponseDto implements LiveOverviewResult {
  @ApiProperty() updatedAt!: string;
  @ApiProperty({ type: SummaryDto }) summary!: SummaryDto;
  @ApiProperty({ type: TabCountsDto }) tabCounts!: TabCountsDto;
  @ApiProperty({ type: [ActiveVisitDto] }) activeVisits!: ActiveVisitDto[];
  @ApiProperty({ type: [AttentionDto] }) attentionRequired!: AttentionDto[];
  @ApiProperty({ type: [ActivityDto] }) recentActivity!: ActivityDto[];

  static fromResult(result: LiveOverviewResult): LiveOverviewResponseDto {
    return result;
  }
}

/** A paginated active visit list (the Active Visits tab). */
export class LiveVisitPageResponseDto implements LiveVisitPageResult {
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty({ type: [ActiveVisitDto] }) rows!: ActiveVisitDto[];

  static fromResult(result: LiveVisitPageResult): LiveVisitPageResponseDto {
    return result;
  }
}

/** One attention item response. */
export class LiveAttentionResponseDto implements LiveAttentionResult {
  @ApiProperty() id!: string;
  @ApiProperty() source!: string;
  @ApiProperty() issueType!: string;
  @ApiProperty() description!: string;
  @ApiProperty() priority!: string;
  @ApiProperty() timeLabel!: string;
  @ApiProperty({ nullable: true, type: String }) recipientName!: string | null;
  @ApiProperty({ nullable: true, type: String }) caregiverName!: string | null;
  @ApiProperty({ nullable: true, type: String }) visitId!: string | null;
  @ApiProperty() primaryAction!: string;
  @ApiProperty() secondaryAction!: string;

  static fromResult(result: LiveAttentionResult): LiveAttentionResponseDto {
    return result;
  }
}

class MapPointDto {
  @ApiProperty() visitId!: string;
  @ApiProperty() recipientName!: string;
  @ApiProperty({ nullable: true, type: Number }) recipientLatitude!: number | null;
  @ApiProperty({ nullable: true, type: Number }) recipientLongitude!: number | null;
  @ApiProperty({ nullable: true, type: String }) caregiverName!: string | null;
  @ApiProperty({ nullable: true, type: Number }) caregiverLatitude!: number | null;
  @ApiProperty({ nullable: true, type: Number }) caregiverLongitude!: number | null;
  @ApiProperty() status!: string;
}

class MapSosDto {
  @ApiProperty() id!: string;
  @ApiProperty({ nullable: true, type: String }) caregiverName!: string | null;
  @ApiProperty({ nullable: true, type: Number }) latitude!: number | null;
  @ApiProperty({ nullable: true, type: Number }) longitude!: number | null;
}

/** The Map View response. */
export class LiveMapResponseDto implements LiveMapResult {
  @ApiProperty({ type: [MapPointDto] }) visits!: MapPointDto[];
  @ApiProperty({ type: [MapSosDto] }) sos!: MapSosDto[];

  static fromResult(result: LiveMapResult): LiveMapResponseDto {
    return result;
  }
}
