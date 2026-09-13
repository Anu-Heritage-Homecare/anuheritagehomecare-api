import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  ALL_CARE_TEAM_ROLES,
  CareTeamRole,
} from '@modules/care-recipients/domain/care-team-role.enum';
import {
  ALL_COVERAGE_SLOTS,
  CoverageSlot,
} from '@modules/care-recipients/domain/coverage-slot.enum';
import { Weekday } from '@modules/care-recipients/domain/weekday.enum';

const ALL_WEEKDAYS = Object.values(Weekday);

export class AssignCaregiverRequestDto {
  @ApiProperty() @IsUUID() caregiverId!: string;

  @ApiProperty({ enum: ALL_CARE_TEAM_ROLES })
  @IsIn(ALL_CARE_TEAM_ROLES)
  role!: CareTeamRole;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) specialization?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) scheduleLabel?: string;

  @ApiProperty() @IsString() @MinLength(1) @MaxLength(500) reason!: string;
}

export class ReviseCaregiverAssignmentRequestDto {
  @ApiPropertyOptional({ enum: ALL_CARE_TEAM_ROLES })
  @IsOptional()
  @IsIn(ALL_CARE_TEAM_ROLES)
  role?: CareTeamRole;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) specialization?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) scheduleLabel?: string;
}

export class RemoveCaregiverRequestDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(500) reason!: string;
}

class CoverageBlockItemDto {
  @ApiProperty({ enum: ALL_WEEKDAYS })
  @IsIn(ALL_WEEKDAYS)
  weekday!: Weekday;

  @ApiProperty({ enum: ALL_COVERAGE_SLOTS })
  @IsIn(ALL_COVERAGE_SLOTS)
  slot!: CoverageSlot;

  @ApiPropertyOptional({ description: 'The covering caregiver, or omit to leave the slot open' })
  @IsOptional()
  @IsUUID()
  caregiverId?: string | null;
}

export class SetCoverageRequestDto {
  @ApiProperty({ type: [CoverageBlockItemDto] })
  @IsArray()
  @ArrayMaxSize(14)
  @ValidateNested({ each: true })
  @Type(() => CoverageBlockItemDto)
  blocks!: CoverageBlockItemDto[];
}
