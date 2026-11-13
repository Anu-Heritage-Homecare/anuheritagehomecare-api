import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Currency } from '@shared/domain/currency.enum';
import { BranchStatus } from '../../domain/branch-status.enum';

const MINUTES_IN_DAY = 24 * 60;

/** Revise the organization profile (the Edit Profile action). All fields optional. */
export class UpdateOrganizationProfileRequestDto {
  @ApiPropertyOptional({ example: 'CareProfs Health Services Ltd' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  legalName?: string;

  @ApiPropertyOptional({ example: 'RC-2847291' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  businessRegNumber?: string;

  @ApiPropertyOptional({ example: '15 Admiralty Way, Lekki Phase 1, Lagos' })
  @IsOptional()
  @IsString()
  @MaxLength(400)
  registeredAddress?: string;

  @ApiPropertyOptional({ example: 'WAT (UTC+1)' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  timezone?: string;

  @ApiPropertyOptional({ example: 'English (UK)' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  systemLanguage?: string;

  @ApiPropertyOptional({ enum: Currency })
  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;

  @ApiPropertyOptional({ example: 'DD/MM/YYYY' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  dateFormat?: string;
}

/** One day of the weekly schedule. Minutes are measured from midnight. */
export class DayHoursDto {
  @ApiProperty({ minimum: 0, maximum: 6, description: '0 = Sunday through 6 = Saturday' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;

  @ApiProperty()
  @IsBoolean()
  isOpen!: boolean;

  @ApiProperty({ minimum: 0, maximum: MINUTES_IN_DAY, example: 540 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(MINUTES_IN_DAY)
  openMinute!: number;

  @ApiProperty({ minimum: 0, maximum: MINUTES_IN_DAY, example: 1260 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(MINUTES_IN_DAY)
  closeMinute!: number;
}

/** Replace the whole weekly schedule (the Edit Schedule action). All seven days required. */
export class SetBusinessHoursRequestDto {
  @ApiProperty({ type: [DayHoursDto] })
  @IsArray()
  @ArrayMinSize(7)
  @ArrayMaxSize(7)
  @ValidateNested({ each: true })
  @Type(() => DayHoursDto)
  days!: DayHoursDto[];
}

/** Add a branch (the Add Branch action). */
export class AddBranchRequestDto {
  @ApiProperty({ example: 'Ikeja Mainland' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @ApiProperty({ example: '24 Allen Avenue' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  addressLine1!: string;

  @ApiPropertyOptional({ example: 'Suite 3B, 2nd Floor' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  addressLine2?: string;

  @ApiProperty({ example: 'Ikeja' }) @IsString() @MinLength(1) @MaxLength(120) city!: string;
  @ApiProperty({ example: 'Lagos' }) @IsString() @MinLength(1) @MaxLength(120) state!: string;

  @ApiPropertyOptional({ example: '08012345678' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @ApiPropertyOptional({ description: 'The admin user who manages this branch' })
  @IsOptional()
  @IsUUID()
  managerId?: string;

  @ApiPropertyOptional({ enum: BranchStatus })
  @IsOptional()
  @IsEnum(BranchStatus)
  status?: BranchStatus;

  @ApiPropertyOptional({ type: [DayHoursDto], description: 'The branch opening schedule (7 days)' })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(7)
  @ArrayMaxSize(7)
  @ValidateNested({ each: true })
  @Type(() => DayHoursDto)
  businessHours?: DayHoursDto[];
}

/** Revise a branch (rename, re-address, reassign manager, activate or deactivate). */
export class UpdateBranchRequestDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(1) @MaxLength(200) name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  addressLine1?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) addressLine2?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(1) @MaxLength(120) city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(1) @MaxLength(120) state?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() managerId?: string;

  @ApiPropertyOptional({ enum: BranchStatus })
  @IsOptional()
  @IsEnum(BranchStatus)
  status?: BranchStatus;

  @ApiPropertyOptional({ type: [DayHoursDto], description: 'The branch opening schedule (7 days)' })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(7)
  @ArrayMaxSize(7)
  @ValidateNested({ each: true })
  @Type(() => DayHoursDto)
  businessHours?: DayHoursDto[];
}

/** Add an emergency contact (the Add action). */
export class AddEmergencyContactRequestDto {
  @ApiProperty({ example: 'Dr. Folake Adeyemi' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional({ example: 'Medical Director' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  role?: string;

  @ApiProperty({ example: '08012345678' })
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  phone!: string;
}

/** Revise an emergency contact. */
export class UpdateEmergencyContactRequestDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(1) @MaxLength(200) name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(160) role?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(1) @MaxLength(40) phone?: string;
}
