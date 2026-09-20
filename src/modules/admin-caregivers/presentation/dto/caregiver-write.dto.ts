import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CaregiverEmploymentType, CaregiverStatus, Gender } from '@prisma/client';
import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const EMPLOYMENT_TYPES = Object.values(CaregiverEmploymentType);
const STATUSES = Object.values(CaregiverStatus);
const GENDERS = Object.values(Gender);

/** Edit the general profile and employment fields of a caregiver. */
export class EditCaregiverProfileDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) branch?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) supervisorName?: string;
  @ApiPropertyOptional({ enum: EMPLOYMENT_TYPES })
  @IsOptional()
  @IsIn(EMPLOYMENT_TYPES)
  employmentType?: CaregiverEmploymentType;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(80) experienceYears?: number;
  @ApiPropertyOptional({ type: String, format: 'date' })
  @IsOptional()
  @IsISO8601()
  joinedAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(168) maxHoursPerWeek?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) preferredShift?: string;
}

/** Set the skills of a caregiver. */
export class CaregiverSkillsDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(60, { each: true })
  skills!: string[];
}

/** Set the languages of a caregiver. */
export class CaregiverLanguagesDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  languages!: string[];
}

/** Set the emergency contact of a caregiver. */
export class CaregiverEmergencyDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) relationship?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() @MaxLength(255) email?: string;
}

/** Set the internal notes and caregiver preferences free text. */
export class CaregiverPreferencesDto {
  @ApiPropertyOptional({ nullable: true, type: String })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  preferencesNote?: string | null;
}

/** Set the status of a caregiver. */
export class CaregiverStatusDto {
  @ApiProperty({ enum: STATUSES })
  @IsIn(STATUSES)
  status!: CaregiverStatus;
}

/** Add a note to a caregiver. */
export class CaregiverNoteDto {
  @ApiProperty() @IsString() @MaxLength(2000) body!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) authorName?: string;
}

/** Edit a caregiver's personal information (writes through to the identity account). */
export class CaregiverPersonalInfoDto {
  @ApiProperty() @IsString() @MaxLength(80) firstName!: string;
  @ApiProperty() @IsString() @MaxLength(80) lastName!: string;
  @ApiProperty() @IsString() @MaxLength(40) phone!: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() @MaxLength(255) email?: string;
  @ApiPropertyOptional({ type: String, format: 'date' })
  @IsOptional()
  @IsISO8601()
  dateOfBirth?: string;
  @ApiPropertyOptional({ enum: GENDERS }) @IsOptional() @IsIn(GENDERS) gender?: Gender;
  @ApiProperty() @IsString() @MaxLength(200) addressLine1!: string;
  @ApiProperty() @IsString() @MaxLength(120) city!: string;
  @ApiProperty() @IsString() @MaxLength(120) state!: string;
  @ApiProperty() @IsString() @MaxLength(20) postalCode!: string;
}

/** Set a caregiver's hourly rate, in integer minor currency units. */
export class CaregiverHourlyRateDto {
  @ApiProperty({ description: 'Hourly rate in minor units, e.g. 2850 for 28.50' })
  @IsInt()
  @Min(0)
  hourlyRateMinor!: number;
}

/** Add or edit a caregiver certification. */
export class CertificationDto {
  @ApiProperty() @IsString() @MaxLength(120) name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) licenseNumber?: string;
  @ApiPropertyOptional({ type: String, format: 'date' })
  @IsOptional()
  @IsISO8601()
  issuedAt?: string;
  @ApiProperty({ type: String, format: 'date' }) @IsISO8601() expiresAt!: string;
}

/** The date range for the caregiver Schedule tab. */
export class CaregiverScheduleQueryDto {
  @ApiProperty({ type: String, format: 'date' })
  @IsISO8601()
  from!: string;

  @ApiProperty({ type: String, format: 'date' })
  @IsISO8601()
  to!: string;
}
