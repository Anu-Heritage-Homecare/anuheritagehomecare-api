import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AssignCaregiverRequestDto {
  @ApiProperty({ description: 'The caregiver to assign to the visit' })
  @IsUUID()
  caregiverId!: string;
}

export class AssignCaregiverResponseDto {
  @ApiProperty()
  visitId!: string;

  @ApiProperty()
  caregiverId!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  assignedAt!: string;
}
