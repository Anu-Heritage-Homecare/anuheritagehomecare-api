import { ApiProperty } from '@nestjs/swagger';
import { SosAlertResult } from '../../application/dto/sos-alert.result';
import { SosAlertStatus } from '../../domain/sos-alert-status.enum';

class SosRecipientDto {
  @ApiProperty({ format: 'uuid' })
  careRecipientId!: string;

  @ApiProperty({ nullable: true, example: 'Eleanor Ross' })
  name!: string | null;

  @ApiProperty({ nullable: true, example: '123 Maple Street, Sunnyvale, CA 94086' })
  address!: string | null;
}

/** The state of an SOS alert after it is raised or cancelled. */
export class SosResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  visitId!: string;

  @ApiProperty({ enum: SosAlertStatus, enumName: 'SosAlertStatus' })
  status!: SosAlertStatus;

  @ApiProperty({ type: SosRecipientDto })
  recipient!: SosRecipientDto;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty({ nullable: true })
  cancelledAt!: string | null;

  static fromResult(result: SosAlertResult): SosResponseDto {
    const dto = new SosResponseDto();
    dto.id = result.id;
    dto.visitId = result.visitId;
    dto.status = result.status;
    dto.recipient = { ...result.recipient };
    dto.createdAt = result.createdAt;
    dto.cancelledAt = result.cancelledAt;
    return dto;
  }
}
