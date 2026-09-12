import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { CareGoalStatus } from '@modules/care-recipients/domain/care-goal-status.enum';
import {
  CareInstructionCategory,
  CareInstructionSeverity,
} from '@modules/care-recipients/domain/care-instruction.enums';

class GoalItemDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(200) label!: string;
  @ApiProperty({ minimum: 0, maximum: 100 }) @IsInt() @Min(0) @Max(100) progressPercent!: number;
  @ApiProperty({ enum: CareGoalStatus })
  @IsIn(Object.values(CareGoalStatus))
  status!: CareGoalStatus;
}

class ScheduleBlockItemDto {
  @ApiProperty({ minimum: 0, maximum: 1439 }) @IsInt() @Min(0) @Max(1439) startMinute!: number;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(200) title!: string;
  @ApiProperty() @IsString() @MaxLength(500) description!: string;
}

class InstructionItemDto {
  @ApiProperty({ enum: CareInstructionCategory })
  @IsIn(Object.values(CareInstructionCategory))
  category!: CareInstructionCategory;

  @ApiProperty() @IsString() @MinLength(1) @MaxLength(300) text!: string;

  @ApiProperty({ enum: CareInstructionSeverity })
  @IsIn(Object.values(CareInstructionSeverity))
  severity!: CareInstructionSeverity;
}

class RevisionNoteDto {
  @ApiPropertyOptional({ description: 'A note describing the change, for the revision history' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  revisionNote?: string;
}

export class SetGoalsRequestDto extends RevisionNoteDto {
  @ApiProperty({ type: [GoalItemDto] })
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => GoalItemDto)
  goals!: GoalItemDto[];
}

export class SetScheduleRequestDto extends RevisionNoteDto {
  @ApiProperty({ type: [ScheduleBlockItemDto] })
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => ScheduleBlockItemDto)
  blocks!: ScheduleBlockItemDto[];
}

export class SetInstructionsRequestDto extends RevisionNoteDto {
  @ApiProperty({ type: [InstructionItemDto] })
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => InstructionItemDto)
  instructions!: InstructionItemDto[];
}
