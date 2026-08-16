import { ApiProperty } from '@nestjs/swagger';
import { VisitAttendanceResult } from '../../application/dto/visit-attendance.result';
import { VisitStatus } from '../../domain/visit-status.enum';

/** The attendance state returned after a clock in or clock out. */
export class VisitAttendanceResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: VisitStatus, enumName: 'VisitStatus' })
  status!: VisitStatus;

  @ApiProperty({ nullable: true })
  clockInAt!: string | null;

  @ApiProperty({ nullable: true })
  clockOutAt!: string | null;

  static fromResult(result: VisitAttendanceResult): VisitAttendanceResponseDto {
    const dto = new VisitAttendanceResponseDto();
    dto.id = result.id;
    dto.status = result.status;
    dto.clockInAt = result.clockInAt;
    dto.clockOutAt = result.clockOutAt;
    return dto;
  }
}
