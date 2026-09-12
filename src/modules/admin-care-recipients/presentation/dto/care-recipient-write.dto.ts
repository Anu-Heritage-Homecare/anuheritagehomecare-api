import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsISO8601,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { CareRecipientPriority } from '@modules/care-recipients/domain/care-recipient-priority.enum';

export class AddCareRecipientRequestDto {
  @ApiProperty({ description: 'The family owner the recipient belongs to' })
  @IsUUID()
  ownerId!: string;

  @ApiProperty({ example: 'Margaret Johnson' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @ApiProperty({ enum: ['MALE', 'FEMALE'] })
  @IsIn(['MALE', 'FEMALE'])
  gender!: string;

  @ApiProperty({ example: '1947-05-01' })
  @IsISO8601()
  dateOfBirth!: string;

  @ApiProperty() @IsString() @MinLength(1) @MaxLength(120) city!: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(120) state!: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(300) fullAddress!: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(120) relationship!: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(120) livingSituation!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  photoKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsLongitude()
  longitude?: number;

  @ApiPropertyOptional({ enum: CareRecipientPriority })
  @IsOptional()
  @IsIn(Object.values(CareRecipientPriority))
  priority?: CareRecipientPriority;
}

export class ChangeStatusRequestDto {
  @ApiProperty({ enum: ['HOLD', 'DISCHARGE', 'REACTIVATE'] })
  @IsIn(['HOLD', 'DISCHARGE', 'REACTIVATE'])
  action!: 'HOLD' | 'DISCHARGE' | 'REACTIVATE';
}

export class SetPriorityRequestDto {
  @ApiProperty({ enum: CareRecipientPriority })
  @IsIn(Object.values(CareRecipientPriority))
  priority!: CareRecipientPriority;
}

export class SetPrimaryCaregiverRequestDto {
  @ApiProperty({ description: 'The caregiver to assign as the primary caregiver' })
  @IsUUID()
  caregiverId!: string;
}
