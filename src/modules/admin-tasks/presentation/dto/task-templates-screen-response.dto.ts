import { ApiProperty } from '@nestjs/swagger';
import { TaskTemplatesScreenResult } from '../../application/dto/task-templates-screen.result';

class TaskTemplatesKpisDto {
  @ApiProperty() activeTemplates!: number;
  @ApiProperty() operations!: number;
  @ApiProperty({ nullable: true, description: 'Deferred until a task scheduler exists' })
  tasksGeneratedThisWeek!: number | null;
  @ApiProperty({ nullable: true, description: 'Deferred until a task scheduler exists' })
  avgCompletionRatePercent!: number | null;
}

class TaskTemplateCardDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() category!: string;
  @ApiProperty() categoryLabel!: string;
  @ApiProperty({ nullable: true }) description!: string | null;
  @ApiProperty() itemCount!: number;
  @ApiProperty({ nullable: true }) estimatedMinutes!: number | null;
  @ApiProperty({ nullable: true }) scheduleLabel!: string | null;
  @ApiProperty({ nullable: true }) assigneeLabel!: string | null;
  @ApiProperty() active!: boolean;
  @ApiProperty({ nullable: true }) tasksGenerated!: number | null;
  @ApiProperty({ nullable: true }) completionRatePercent!: number | null;
}

export class TaskTemplatesScreenResponseDto {
  @ApiProperty({ type: TaskTemplatesKpisDto }) kpis!: TaskTemplatesKpisDto;
  @ApiProperty({ type: [TaskTemplateCardDto] }) templates!: TaskTemplateCardDto[];

  static fromResult(result: TaskTemplatesScreenResult): TaskTemplatesScreenResponseDto {
    const dto = new TaskTemplatesScreenResponseDto();
    Object.assign(dto, result);
    return dto;
  }
}
