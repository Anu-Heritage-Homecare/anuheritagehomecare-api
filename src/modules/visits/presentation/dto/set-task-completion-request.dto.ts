import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

/** Whether a checklist task is complete. The task is identified by its position. */
export class SetTaskCompletionRequestDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  completed!: boolean;
}
