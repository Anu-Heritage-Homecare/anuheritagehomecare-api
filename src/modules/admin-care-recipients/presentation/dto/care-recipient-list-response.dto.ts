import { ApiProperty } from '@nestjs/swagger';
import { CareRecipientListResult } from '../../application/dto/care-recipient-list.result';

class SummaryDto {
  @ApiProperty() total!: number;
  @ApiProperty() active!: number;
  @ApiProperty() onHold!: number;
  @ApiProperty() discharged!: number;
  @ApiProperty() newThisMonth!: number;
  @ApiProperty() activePercent!: number;
}

class TabCountsDto {
  @ApiProperty() all!: number;
  @ApiProperty() active!: number;
  @ApiProperty() onHold!: number;
  @ApiProperty() highPriority!: number;
  @ApiProperty() newlyAdded!: number;
}

class ActionTriggersDto {
  @ApiProperty() needsAttention!: number;
  @ApiProperty() missingCarePlan!: number;
  @ApiProperty() overdueVisit!: number;
}

class ListItemDto {
  @ApiProperty() id!: string;
  @ApiProperty({ example: 'CR-001' }) code!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ nullable: true }) photoKey!: string | null;
  @ApiProperty() age!: number;
  @ApiProperty({ nullable: true }) primaryCondition!: string | null;
  @ApiProperty({ nullable: true }) careLevel!: string | null;
  @ApiProperty({ nullable: true }) assignedCaregiverName!: string | null;
  @ApiProperty() status!: string;
  @ApiProperty() priority!: string;
  @ApiProperty({ nullable: true, type: String, format: 'date-time' }) lastVisitAt!: string | null;
}

export class CareRecipientListResponseDto {
  @ApiProperty({ type: SummaryDto }) summary!: SummaryDto;
  @ApiProperty({ type: TabCountsDto }) tabs!: TabCountsDto;
  @ApiProperty({ type: ActionTriggersDto }) actionTriggers!: ActionTriggersDto;
  @ApiProperty({ type: [ListItemDto] }) items!: ListItemDto[];
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty() total!: number;
  @ApiProperty() totalPages!: number;

  static fromResult(result: CareRecipientListResult): CareRecipientListResponseDto {
    const dto = new CareRecipientListResponseDto();
    dto.summary = { ...result.summary };
    dto.tabs = { ...result.tabs };
    dto.actionTriggers = { ...result.actionTriggers };
    dto.items = result.items.map((item) => ({
      ...item,
      lastVisitAt: item.lastVisitAt === null ? null : item.lastVisitAt.toISOString(),
    }));
    dto.page = result.page;
    dto.pageSize = result.pageSize;
    dto.total = result.total;
    dto.totalPages = result.totalPages;
    return dto;
  }
}
