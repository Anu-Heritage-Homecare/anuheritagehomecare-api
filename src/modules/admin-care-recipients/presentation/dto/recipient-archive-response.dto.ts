import { ApiProperty } from '@nestjs/swagger';
import { RecipientArchiveResult } from '../../application/dto/recipient-archive.result';

class MoneyDto {
  @ApiProperty() amountMinor!: number;
  @ApiProperty() currency!: string;
}

class ArchiveSummaryDto {
  @ApiProperty() status!: string;
  @ApiProperty() careDurationMonths!: number;
  @ApiProperty() careDurationLabel!: string;
  @ApiProperty() totalVisitsCompleted!: number;
  @ApiProperty() activePlan!: boolean;
  @ApiProperty({ nullable: true }) planLevel!: string | null;
  @ApiProperty({ type: MoneyDto, nullable: true }) outstandingBalance!: MoneyDto | null;
  @ApiProperty() assignedCaregivers!: number;
}

class ChecklistItemDto {
  @ApiProperty() key!: string;
  @ApiProperty() label!: string;
  @ApiProperty() detail!: string;
  @ApiProperty() status!: string;
}

class DischargeDraftDto {
  @ApiProperty() action!: string;
  @ApiProperty({ nullable: true }) reason!: string | null;
  @ApiProperty({ nullable: true, type: String, format: 'date' }) effectiveDate!: string | null;
  @ApiProperty({ nullable: true }) clinicalSummary!: string | null;
  @ApiProperty({ type: [String] }) acknowledgements!: string[];
  @ApiProperty() status!: string;
  @ApiProperty({ nullable: true, type: String, format: 'date-time' }) processedAt!: string | null;
}

export class RecipientArchiveResponseDto {
  @ApiProperty({ type: ArchiveSummaryDto }) summary!: ArchiveSummaryDto;
  @ApiProperty({ type: [ChecklistItemDto] }) checklist!: ChecklistItemDto[];
  @ApiProperty({ type: DischargeDraftDto, nullable: true }) draft!: DischargeDraftDto | null;

  static fromResult(result: RecipientArchiveResult): RecipientArchiveResponseDto {
    const dto = new RecipientArchiveResponseDto();
    dto.summary = {
      status: result.summary.status,
      careDurationMonths: result.summary.careDurationMonths,
      careDurationLabel: result.summary.careDurationLabel,
      totalVisitsCompleted: result.summary.totalVisitsCompleted,
      activePlan: result.summary.activePlan,
      planLevel: result.summary.planLevel,
      outstandingBalance:
        result.summary.outstandingBalance === null
          ? null
          : { ...result.summary.outstandingBalance },
      assignedCaregivers: result.summary.assignedCaregivers,
    };
    dto.checklist = result.checklist.map((item) => ({ ...item }));
    dto.draft =
      result.draft === null
        ? null
        : {
            action: result.draft.action,
            reason: result.draft.reason,
            effectiveDate:
              result.draft.effectiveDate === null
                ? null
                : result.draft.effectiveDate.toISOString().slice(0, 10),
            clinicalSummary: result.draft.clinicalSummary,
            acknowledgements: [...result.draft.acknowledgements],
            status: result.draft.status,
            processedAt:
              result.draft.processedAt === null ? null : result.draft.processedAt.toISOString(),
          };
    return dto;
  }
}
