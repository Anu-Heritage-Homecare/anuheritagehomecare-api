import { ApiProperty } from '@nestjs/swagger';
import { CareRequestResult } from '../../application/dto/care-request.result';
import { CareRequestStatus } from '../../domain/care-request-status.enum';

/** The stored additional care request returned after submission. */
export class CareRequestResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  careRecipientId!: string;

  @ApiProperty({ example: 'Overnight care' })
  careType!: string;

  @ApiProperty({ example: '2026-09-01' })
  requestedDate!: string;

  @ApiProperty({ example: 540 })
  startMinute!: number;

  @ApiProperty({ example: 180 })
  durationMinutes!: number;

  @ApiProperty({ nullable: true })
  reason!: string | null;

  @ApiProperty({ enum: CareRequestStatus, enumName: 'CareRequestStatus' })
  status!: CareRequestStatus;

  @ApiProperty()
  createdAt!: string;

  static fromResult(result: CareRequestResult): CareRequestResponseDto {
    const dto = new CareRequestResponseDto();
    dto.id = result.id;
    dto.careRecipientId = result.careRecipientId;
    dto.careType = result.careType;
    dto.requestedDate = result.requestedDate;
    dto.startMinute = result.startMinute;
    dto.durationMinutes = result.durationMinutes;
    dto.reason = result.reason;
    dto.status = result.status;
    dto.createdAt = result.createdAt;
    return dto;
  }
}
