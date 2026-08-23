import { ApiProperty } from '@nestjs/swagger';
import { VisitCompletionResult } from '../../application/dto/visit-completion.result';
import { VisitStatus } from '../../domain/visit-status.enum';

/**
 * The outcome of completing a visit, for the confirmation screen: who it was with
 * and how the time broke down (active time on the visit, and break time), plus the
 * server clock in and clock out stamps.
 */
export class VisitCompletionResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: VisitStatus, enumName: 'VisitStatus' })
  status!: VisitStatus;

  @ApiProperty({ nullable: true, description: 'The care recipient the visit was with' })
  recipientName!: string | null;

  @ApiProperty({ nullable: true })
  clockInAt!: string | null;

  @ApiProperty({ nullable: true })
  clockOutAt!: string | null;

  @ApiProperty({ description: 'Whole seconds actively on the visit, excluding breaks' })
  activeSeconds!: number;

  @ApiProperty({ description: 'Whole seconds spent on breaks during the visit' })
  breakSeconds!: number;

  static fromResult(result: VisitCompletionResult): VisitCompletionResponseDto {
    const dto = new VisitCompletionResponseDto();
    dto.id = result.id;
    dto.status = result.status;
    dto.recipientName = result.recipientName;
    dto.clockInAt = result.clockInAt;
    dto.clockOutAt = result.clockOutAt;
    dto.activeSeconds = result.activeSeconds;
    dto.breakSeconds = result.breakSeconds;
    return dto;
  }
}
