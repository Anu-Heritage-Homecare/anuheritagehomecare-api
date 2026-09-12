import { ApiProperty } from '@nestjs/swagger';
import { CarePlanResult } from '../../application/dto/care-plan.result';

class GoalDto {
  @ApiProperty() label!: string;
  @ApiProperty() progressPercent!: number;
  @ApiProperty() status!: string;
}
class ScheduleBlockDto {
  @ApiProperty() startMinute!: number;
  @ApiProperty() title!: string;
  @ApiProperty() description!: string;
}
class InstructionDto {
  @ApiProperty() text!: string;
  @ApiProperty() severity!: string;
}
class InstructionsDto {
  @ApiProperty({ type: [InstructionDto] }) medical!: InstructionDto[];
  @ApiProperty({ type: [InstructionDto] }) behavioral!: InstructionDto[];
}
class RevisionDto {
  @ApiProperty({ type: String, format: 'date-time' }) at!: string;
  @ApiProperty() description!: string;
  @ApiProperty({ nullable: true }) authorName!: string | null;
}

export class CarePlanResponseDto {
  @ApiProperty({ type: [GoalDto] }) goals!: GoalDto[];
  @ApiProperty({ type: [ScheduleBlockDto] }) schedule!: ScheduleBlockDto[];
  @ApiProperty({ type: InstructionsDto }) instructions!: InstructionsDto;
  @ApiProperty({ type: [RevisionDto] }) revisions!: RevisionDto[];

  static fromResult(result: CarePlanResult): CarePlanResponseDto {
    const dto = new CarePlanResponseDto();
    dto.goals = result.goals.map((g) => ({ ...g }));
    dto.schedule = result.schedule.map((b) => ({ ...b }));
    dto.instructions = {
      medical: result.instructions.medical.map((i) => ({ ...i })),
      behavioral: result.instructions.behavioral.map((i) => ({ ...i })),
    };
    dto.revisions = result.revisions.map((r) => ({
      at: r.at.toISOString(),
      description: r.description,
      authorName: r.authorName,
    }));
    return dto;
  }
}
