import { ApiProperty } from '@nestjs/swagger';
import { RecipientVisitsResult } from '../../application/dto/recipient-visits.result';

class VisitsSummaryDto {
  @ApiProperty() totalVisits!: number;
  @ApiProperty() thisMonthVisits!: number;
  @ApiProperty({ example: 2.5 }) avgDurationHours!: number;
  @ApiProperty({ example: 98.2 }) completionRatePercent!: number;
  @ApiProperty() successfulVisits!: number;
}

class CaregiverOptionDto {
  @ApiProperty() id!: string;
  @ApiProperty({ nullable: true }) name!: string | null;
}

class VisitRowDto {
  @ApiProperty() id!: string;
  @ApiProperty({ type: String, format: 'date-time' }) date!: string;
  @ApiProperty() startMinute!: number;
  @ApiProperty() endMinute!: number;
  @ApiProperty({ nullable: true }) caregiverId!: string | null;
  @ApiProperty({ nullable: true }) caregiverName!: string | null;
  @ApiProperty() visitType!: string;
  @ApiProperty() durationMinutes!: number;
  @ApiProperty({ nullable: true, type: String, format: 'date-time' }) clockInAt!: string | null;
  @ApiProperty({ nullable: true, type: String, format: 'date-time' }) clockOutAt!: string | null;
  @ApiProperty() status!: string;
  @ApiProperty() lateArrival!: boolean;
}

class VisitsPageDto {
  @ApiProperty({ type: [VisitRowDto] }) items!: VisitRowDto[];
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty() total!: number;
  @ApiProperty() totalPages!: number;
}

class MostCommonVisitTypeDto {
  @ApiProperty() visitType!: string;
  @ApiProperty() percent!: number;
}

class PrimaryCaregiverCoverageDto {
  @ApiProperty() caregiverId!: string;
  @ApiProperty({ nullable: true }) name!: string | null;
  @ApiProperty() visitCount!: number;
  @ApiProperty() percent!: number;
}

class VisitsAnalyticsDto {
  @ApiProperty({ type: [Number] }) weeklyCounts!: number[];
  @ApiProperty({ nullable: true }) visitsPerWeekTrendPercent!: number | null;
  @ApiProperty({ type: MostCommonVisitTypeDto, nullable: true })
  mostCommonVisitType!: MostCommonVisitTypeDto | null;
  @ApiProperty({ type: PrimaryCaregiverCoverageDto, nullable: true })
  primaryCaregiverCoverage!: PrimaryCaregiverCoverageDto | null;
}

export class RecipientVisitsResponseDto {
  @ApiProperty({ type: VisitsSummaryDto }) summary!: VisitsSummaryDto;
  @ApiProperty({ type: [CaregiverOptionDto] }) caregivers!: CaregiverOptionDto[];
  @ApiProperty({ type: VisitsPageDto }) page!: VisitsPageDto;
  @ApiProperty({ type: VisitsAnalyticsDto }) analytics!: VisitsAnalyticsDto;

  static fromResult(result: RecipientVisitsResult): RecipientVisitsResponseDto {
    const dto = new RecipientVisitsResponseDto();
    dto.summary = { ...result.summary };
    dto.caregivers = result.caregivers.map((c) => ({ ...c }));
    dto.page = {
      items: result.page.items.map((item) => ({
        id: item.id,
        date: item.date.toISOString(),
        startMinute: item.startMinute,
        endMinute: item.endMinute,
        caregiverId: item.caregiverId,
        caregiverName: item.caregiverName,
        visitType: item.visitType,
        durationMinutes: item.durationMinutes,
        clockInAt: item.clockInAt === null ? null : item.clockInAt.toISOString(),
        clockOutAt: item.clockOutAt === null ? null : item.clockOutAt.toISOString(),
        status: item.status,
        lateArrival: item.lateArrival,
      })),
      page: result.page.page,
      pageSize: result.page.pageSize,
      total: result.page.total,
      totalPages: result.page.totalPages,
    };
    dto.analytics = {
      weeklyCounts: [...result.analytics.weeklyCounts],
      visitsPerWeekTrendPercent: result.analytics.visitsPerWeekTrendPercent,
      mostCommonVisitType:
        result.analytics.mostCommonVisitType === null
          ? null
          : { ...result.analytics.mostCommonVisitType },
      primaryCaregiverCoverage:
        result.analytics.primaryCaregiverCoverage === null
          ? null
          : { ...result.analytics.primaryCaregiverCoverage },
    };
    return dto;
  }
}
