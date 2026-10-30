import { ApiProperty } from '@nestjs/swagger';
import {
  TaskRowResult,
  TasksKpisResult,
  TasksScreenResult,
  TasksTabCountsResult,
} from '../../application/dto/tasks-screen.result';

class TasksKpisDto implements TasksKpisResult {
  @ApiProperty() openTasks!: number;
  @ApiProperty() completedToday!: number;
  @ApiProperty() overdue!: number;
  @ApiProperty() highPriority!: number;
  @ApiProperty() dueToday!: number;
  @ApiProperty() completionRatePercent!: number;
}

class TasksTabCountsDto implements TasksTabCountsResult {
  @ApiProperty() all!: number;
  @ApiProperty() today!: number;
  @ApiProperty() overdue!: number;
  @ApiProperty() completed!: number;
}

class TaskRowDto implements TaskRowResult {
  @ApiProperty() id!: string;
  @ApiProperty() title!: string;
  @ApiProperty({ nullable: true }) relatedVisitLabel!: string | null;
  @ApiProperty() assignee!: string;
  @ApiProperty({ nullable: true }) recipientName!: string | null;
  @ApiProperty({ nullable: true }) dueAt!: string | null;
  @ApiProperty({ nullable: true }) dueDateLabel!: string | null;
  @ApiProperty() priority!: string;
  @ApiProperty() priorityLabel!: string;
  @ApiProperty() status!: string;
  @ApiProperty() statusLabel!: string;
  @ApiProperty() category!: string;
  @ApiProperty() categoryLabel!: string;
}

/** The Tasks screen response. */
export class TasksScreenResponseDto implements TasksScreenResult {
  @ApiProperty({ type: TasksKpisDto }) kpis!: TasksKpisDto;
  @ApiProperty({ type: TasksTabCountsDto }) tabCounts!: TasksTabCountsDto;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty() total!: number;
  @ApiProperty() totalPages!: number;
  @ApiProperty({ type: [TaskRowDto] }) rows!: TaskRowDto[];
  @ApiProperty() generatedAt!: string;

  static fromResult(result: TasksScreenResult): TasksScreenResponseDto {
    return result;
  }
}
