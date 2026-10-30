import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

const MAX_DURATION_MINUTES = 24 * 60;
const MAX_NOTE_LENGTH = 2000;

/** Whether a checklist task is complete. The task is identified by its position. */
export class SetTaskCompletionRequestDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  completed!: boolean;

  @ApiPropertyOptional({
    minimum: 0,
    maximum: MAX_DURATION_MINUTES,
    example: 15,
    description: 'How long the task took, in whole minutes (only when completing it)',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_DURATION_MINUTES)
  durationMinutes?: number;

  @ApiPropertyOptional({
    nullable: true,
    description: "The caregiver's note for this task",
    example: 'Patient was cooperative and chose her favorite blue dress.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_NOTE_LENGTH)
  note?: string | null;
}
