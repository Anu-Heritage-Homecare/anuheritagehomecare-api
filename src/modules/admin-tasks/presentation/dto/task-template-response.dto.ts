import { ApiProperty } from '@nestjs/swagger';
import { TaskTemplateResult } from '../../application/dto/task-template.result';

/** A reusable task template. */
export class TaskTemplateResponseDto implements TaskTemplateResult {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() title!: string;
  @ApiProperty({ nullable: true }) description!: string | null;
  @ApiProperty() category!: string;
  @ApiProperty() priority!: string;
  @ApiProperty({ nullable: true }) defaultAssigneeLabel!: string | null;
  @ApiProperty({ type: [String] }) checklistItems!: string[];
  @ApiProperty({ nullable: true }) scheduleLabel!: string | null;
  @ApiProperty({ nullable: true }) estimatedMinutes!: number | null;
  @ApiProperty() active!: boolean;

  static fromResult(result: TaskTemplateResult): TaskTemplateResponseDto {
    return result;
  }

  static listFromResults(results: TaskTemplateResult[]): TaskTemplateResponseDto[] {
    return results;
  }
}

/** The result of a bulk task operation. */
export class BulkTaskResultDto {
  @ApiProperty() affected!: number;
}
