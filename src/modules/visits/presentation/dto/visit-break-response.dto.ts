import { ApiProperty } from '@nestjs/swagger';
import { VisitBreakResult } from '../../application/dto/visit-break.result';
import { VisitStatus } from '../../domain/visit-status.enum';

/** The break state returned after starting or ending a break. */
export class VisitBreakResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: VisitStatus, enumName: 'VisitStatus' })
  status!: VisitStatus;

  @ApiProperty({ example: 900, description: 'Total whole seconds spent on closed breaks' })
  breakSeconds!: number;

  @ApiProperty({
    nullable: true,
    description: 'When the current open break began, or null if not on break',
  })
  onBreakSince!: string | null;

  static fromResult(result: VisitBreakResult): VisitBreakResponseDto {
    const dto = new VisitBreakResponseDto();
    dto.id = result.id;
    dto.status = result.status;
    dto.breakSeconds = result.breakSeconds;
    dto.onBreakSince = result.onBreakSince;
    return dto;
  }
}
