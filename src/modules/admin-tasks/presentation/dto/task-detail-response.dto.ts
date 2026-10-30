import { ApiProperty } from '@nestjs/swagger';
import { TaskDetailResult } from '../../application/dto/task-detail.result';

class TaskChecklistItemDto {
  @ApiProperty() id!: string;
  @ApiProperty() label!: string;
  @ApiProperty() done!: boolean;
}

class TaskProgressDto {
  @ApiProperty() completed!: number;
  @ApiProperty() total!: number;
  @ApiProperty() percent!: number;
}

class TaskCommentDto {
  @ApiProperty() id!: string;
  @ApiProperty() authorName!: string;
  @ApiProperty() body!: string;
  @ApiProperty() at!: string;
}

class TaskActivityEntryDto {
  @ApiProperty() kind!: string;
  @ApiProperty() label!: string;
  @ApiProperty() at!: string;
}

class TaskRelatedVisitDto {
  @ApiProperty() id!: string;
  @ApiProperty() visitLabel!: string;
  @ApiProperty() dateLabel!: string;
  @ApiProperty() timeRange!: string;
  @ApiProperty() statusLabel!: string;
  @ApiProperty({ nullable: true }) caregiverName!: string | null;
  @ApiProperty({ nullable: true }) recipientName!: string | null;
  @ApiProperty({ nullable: true }) location!: string | null;
}

class TaskRelatedTaskDto {
  @ApiProperty() id!: string;
  @ApiProperty() title!: string;
  @ApiProperty() statusLabel!: string;
  @ApiProperty({ nullable: true }) dueDateLabel!: string | null;
}

export class TaskDetailResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() title!: string;
  @ApiProperty({ nullable: true }) description!: string | null;
  @ApiProperty() status!: string;
  @ApiProperty() statusLabel!: string;
  @ApiProperty() priority!: string;
  @ApiProperty() priorityLabel!: string;
  @ApiProperty() category!: string;
  @ApiProperty() categoryLabel!: string;
  @ApiProperty({ nullable: true }) assigneeName!: string | null;
  @ApiProperty({ nullable: true }) recipientName!: string | null;
  @ApiProperty() createdByLabel!: string;
  @ApiProperty({ nullable: true }) recurrenceLabel!: string | null;
  @ApiProperty({ nullable: true }) estimatedMinutes!: number | null;
  @ApiProperty({ nullable: true }) dueAt!: string | null;
  @ApiProperty({ nullable: true }) dueDateLabel!: string | null;
  @ApiProperty() createdAt!: string;
  @ApiProperty({ nullable: true }) completedAt!: string | null;
  @ApiProperty({ type: TaskProgressDto }) progress!: TaskProgressDto;
  @ApiProperty({ type: [TaskChecklistItemDto] }) checklist!: TaskChecklistItemDto[];
  @ApiProperty({ type: [TaskCommentDto] }) comments!: TaskCommentDto[];
  @ApiProperty({ type: [TaskActivityEntryDto] }) activity!: TaskActivityEntryDto[];
  @ApiProperty({ type: TaskRelatedVisitDto, nullable: true })
  relatedVisit!: TaskRelatedVisitDto | null;
  @ApiProperty({ type: [TaskRelatedTaskDto] }) relatedTasks!: TaskRelatedTaskDto[];

  static fromResult(result: TaskDetailResult): TaskDetailResponseDto {
    const dto = new TaskDetailResponseDto();
    Object.assign(dto, result);
    return dto;
  }
}
