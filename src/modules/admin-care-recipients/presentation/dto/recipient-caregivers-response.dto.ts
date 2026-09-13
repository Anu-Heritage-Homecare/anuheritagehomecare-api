import { ApiProperty } from '@nestjs/swagger';
import { RecipientCaregiversResult } from '../../application/dto/recipient-caregivers.result';

class CaregiversSummaryDto {
  @ApiProperty() assignedCaregivers!: number;
  @ApiProperty() totalCareHoursThisMonth!: number;
  @ApiProperty() careHoursTrend!: number;
  @ApiProperty() coverageRatePercent!: number;
}

class CareTeamMemberDto {
  @ApiProperty() assignmentId!: string;
  @ApiProperty() caregiverId!: string;
  @ApiProperty({ nullable: true }) name!: string | null;
  @ApiProperty({ nullable: true }) photoKey!: string | null;
  @ApiProperty() role!: string;
  @ApiProperty() status!: string;
  @ApiProperty({ nullable: true }) specialization!: string | null;
  @ApiProperty({ nullable: true }) scheduleLabel!: string | null;
  @ApiProperty() hoursThisMonth!: number;
  @ApiProperty({ nullable: true }) rating!: number | null;
  @ApiProperty({ type: [String] }) certifications!: string[];
}

class CoverageBlockDto {
  @ApiProperty() weekday!: string;
  @ApiProperty() slot!: string;
  @ApiProperty({ nullable: true }) caregiverId!: string | null;
  @ApiProperty({ nullable: true }) caregiverName!: string | null;
}

class AssignmentHistoryDto {
  @ApiProperty({ type: String, format: 'date-time' }) at!: string;
  @ApiProperty() action!: string;
  @ApiProperty() caregiverId!: string;
  @ApiProperty({ nullable: true }) caregiverName!: string | null;
  @ApiProperty() reason!: string;
  @ApiProperty({ nullable: true }) byName!: string | null;
}

export class RecipientCaregiversResponseDto {
  @ApiProperty({ type: CaregiversSummaryDto }) summary!: CaregiversSummaryDto;
  @ApiProperty({ type: [CareTeamMemberDto] }) team!: CareTeamMemberDto[];
  @ApiProperty({ type: [CoverageBlockDto] }) coverage!: CoverageBlockDto[];
  @ApiProperty({ type: [AssignmentHistoryDto] }) history!: AssignmentHistoryDto[];

  static fromResult(result: RecipientCaregiversResult): RecipientCaregiversResponseDto {
    const dto = new RecipientCaregiversResponseDto();
    dto.summary = { ...result.summary };
    dto.team = result.team.map((m) => ({ ...m, certifications: [...m.certifications] }));
    dto.coverage = result.coverage.map((b) => ({ ...b }));
    dto.history = result.history.map((h) => ({
      at: h.at.toISOString(),
      action: h.action,
      caregiverId: h.caregiverId,
      caregiverName: h.caregiverName,
      reason: h.reason,
      byName: h.byName,
    }));
    return dto;
  }
}
