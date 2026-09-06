import { ApiProperty } from '@nestjs/swagger';
import { TaskResult } from '../../application/dto/task.result';
import { TaskPriority } from '../../domain/task-priority.enum';
import { TaskStatus } from '../../domain/task-status.enum';

export class TaskResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty({ nullable: true })
  description!: string | null;

  @ApiProperty({ enum: TaskStatus })
  status!: TaskStatus;

  @ApiProperty({ enum: TaskPriority })
  priority!: TaskPriority;

  @ApiProperty({ nullable: true })
  assignedToAdminId!: string | null;

  @ApiProperty({ nullable: true })
  relatedCareRecipientId!: string | null;

  @ApiProperty({ nullable: true, type: String, format: 'date-time' })
  dueAt!: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ nullable: true, type: String, format: 'date-time' })
  completedAt!: string | null;

  static fromResult(result: TaskResult): TaskResponseDto {
    const dto = new TaskResponseDto();
    dto.id = result.id;
    dto.title = result.title;
    dto.description = result.description;
    dto.status = result.status;
    dto.priority = result.priority;
    dto.assignedToAdminId = result.assignedToAdminId;
    dto.relatedCareRecipientId = result.relatedCareRecipientId;
    dto.dueAt = result.dueAt === null ? null : result.dueAt.toISOString();
    dto.createdAt = result.createdAt.toISOString();
    dto.completedAt = result.completedAt === null ? null : result.completedAt.toISOString();
    return dto;
  }
}

export class TaskListResponseDto {
  @ApiProperty({ type: [TaskResponseDto] })
  tasks!: TaskResponseDto[];

  static fromResults(results: TaskResult[]): TaskListResponseDto {
    const dto = new TaskListResponseDto();
    dto.tasks = results.map((result) => TaskResponseDto.fromResult(result));
    return dto;
  }
}
