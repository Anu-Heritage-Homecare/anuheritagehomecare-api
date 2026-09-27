import { ApiProperty } from '@nestjs/swagger';
import {
  SchedulingCalendarDayResult,
  SchedulingConflictResult,
  SchedulingConsoleResult,
  SchedulingSummaryResult,
  SchedulingVisitPageResult,
  SchedulingVisitResult,
} from '../../application/dto/scheduling.result';

class SummaryDto implements SchedulingSummaryResult {
  @ApiProperty() todaysVisits!: number;
  @ApiProperty() upcomingVisits!: number;
  @ApiProperty() availableCaregivers!: number;
  @ApiProperty() unassignedVisits!: number;
  @ApiProperty() scheduleConflicts!: number;
  @ApiProperty() completedVisits!: number;
}

class TabCountsDto {
  @ApiProperty() unassigned!: number;
  @ApiProperty() conflicts!: number;
}

class VisitDto implements SchedulingVisitResult {
  @ApiProperty() id!: string;
  @ApiProperty() date!: string;
  @ApiProperty() time!: string;
  @ApiProperty() endTime!: string;
  @ApiProperty() recipientName!: string;
  @ApiProperty({ nullable: true, type: String }) caregiverId!: string | null;
  @ApiProperty({ nullable: true, type: String }) caregiverName!: string | null;
  @ApiProperty() service!: string;
  @ApiProperty() status!: string;
  @ApiProperty() priority!: string;
  @ApiProperty() assignable!: boolean;
}

class VisitPageDto implements SchedulingVisitPageResult {
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty({ type: [VisitDto] }) rows!: VisitDto[];
}

/** The Scheduling console response. */
export class SchedulingConsoleResponseDto implements SchedulingConsoleResult {
  @ApiProperty() date!: string;
  @ApiProperty({ type: SummaryDto }) summary!: SummaryDto;
  @ApiProperty({ type: TabCountsDto }) tabCounts!: TabCountsDto;
  @ApiProperty({ type: VisitPageDto }) visits!: VisitPageDto;

  static fromResult(result: SchedulingConsoleResult): SchedulingConsoleResponseDto {
    return result;
  }
}

/** A paginated visit list (the Unassigned Visits tab). */
export class SchedulingVisitPageResponseDto implements SchedulingVisitPageResult {
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty({ type: [VisitDto] }) rows!: VisitDto[];

  static fromResult(result: SchedulingVisitPageResult): SchedulingVisitPageResponseDto {
    return result;
  }
}

/** One conflict between two overlapping visits. */
export class SchedulingConflictResponseDto implements SchedulingConflictResult {
  @ApiProperty() caregiverId!: string;
  @ApiProperty({ nullable: true, type: String }) caregiverName!: string | null;
  @ApiProperty({ type: VisitDto }) first!: VisitDto;
  @ApiProperty({ type: VisitDto }) second!: VisitDto;

  static fromResult(result: SchedulingConflictResult): SchedulingConflictResponseDto {
    return result;
  }
}

/** One day of the calendar feed. */
export class SchedulingCalendarDayResponseDto implements SchedulingCalendarDayResult {
  @ApiProperty() date!: string;
  @ApiProperty({ type: [VisitDto] }) visits!: VisitDto[];

  static fromResult(result: SchedulingCalendarDayResult): SchedulingCalendarDayResponseDto {
    return result;
  }
}
