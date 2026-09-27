import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CaregiverEmploymentType, CaregiverStatus, Gender } from '@prisma/client';
import { CaregiverDocumentCategory } from '@modules/caregiver-documents/domain/caregiver-document-category.enum';
import { CaregiverDocumentStatus } from '@modules/caregiver-documents/domain/caregiver-document-status.enum';
import { CredentialKind } from '@modules/certifications/domain/credential-kind.enum';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
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

/** Set the office flagged coaching areas for growth shown on the Performance tab. */
export class CaregiverAreasForGrowthDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  areasForGrowth!: string[];
}

/** Record a coordinator review of a caregiver from the Performance tab. */
export class RecordCaregiverReviewDto {
  @ApiProperty({ minimum: 1, maximum: 5 }) @IsInt() @Min(1) @Max(5) score!: number;
  @ApiPropertyOptional({ nullable: true, type: String })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string | null;
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(60, { each: true })
  traits?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) reviewerName?: string;
  @ApiPropertyOptional({ description: 'Optional care recipient this review relates to' })
  @IsOptional()
  @IsUUID()
  careRecipientId?: string;
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

const CREDENTIAL_KINDS = Object.values(CredentialKind);

/** Add or edit a caregiver certification. */
export class CertificationDto {
  @ApiProperty() @IsString() @MaxLength(120) name!: string;
  @ApiPropertyOptional({ enum: CREDENTIAL_KINDS })
  @IsOptional()
  @IsIn(CREDENTIAL_KINDS)
  kind?: CredentialKind;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) licenseNumber?: string;
  @ApiPropertyOptional({ type: String, format: 'date' })
  @IsOptional()
  @IsISO8601()
  issuedAt?: string;
  @ApiProperty({ type: String, format: 'date' }) @IsISO8601() expiresAt!: string;
  @ApiPropertyOptional({ description: 'Opaque storage key for the uploaded file' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  documentKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) fileName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) uploadedBy?: string;
}

const DOCUMENT_CATEGORIES = Object.values(CaregiverDocumentCategory);
const DOCUMENT_STATUSES = Object.values(CaregiverDocumentStatus);

/** Add an employment document to a caregiver. The file is an opaque key. */
export class AddCaregiverDocumentDto {
  @ApiProperty() @IsString() @MaxLength(200) name!: string;
  @ApiProperty({ enum: DOCUMENT_CATEGORIES })
  @IsIn(DOCUMENT_CATEGORIES)
  category!: CaregiverDocumentCategory;
  @ApiPropertyOptional({ enum: DOCUMENT_STATUSES })
  @IsOptional()
  @IsIn(DOCUMENT_STATUSES)
  status?: CaregiverDocumentStatus;
  @ApiPropertyOptional({ type: String, format: 'date' })
  @IsOptional()
  @IsISO8601()
  documentDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) documentKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) fileName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) uploadedBy?: string;
}

/** Record a training course a caregiver has taken or is taking. */
export class RecordCaregiverTrainingDto {
  @ApiProperty() @IsString() @MaxLength(200) name!: string;
  @ApiPropertyOptional({ type: String, format: 'date' })
  @IsOptional()
  @IsISO8601()
  completedAt?: string;
  @ApiPropertyOptional({ default: false }) @IsOptional() @IsBoolean() certificate?: boolean;
  @ApiPropertyOptional({ default: 0 }) @IsOptional() @IsInt() @Min(0) hoursCompleted?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) hoursRequired?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) documentKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) fileName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) uploadedBy?: string;
}

/** The week to show on the caregiver Schedule tab; any date within it, default this week. */
export class CaregiverScheduleQueryDto {
  @ApiPropertyOptional({ type: String, format: 'date' })
  @IsOptional()
  @IsISO8601()
  weekOf?: string;
}

/** One availability window, in minutes from midnight. */
export class AvailabilitySlotDto {
  @ApiProperty() @IsInt() @Min(0) @Max(1440) startMinute!: number;
  @ApiProperty() @IsInt() @Min(0) @Max(1440) endMinute!: number;
}

/** One day of availability windows to set for a caregiver. */
export class AvailabilityDayDto {
  @ApiProperty({ type: String, format: 'date' }) @IsISO8601() date!: string;
  @ApiProperty({ type: [AvailabilitySlotDto] })
  @IsArray()
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => AvailabilitySlotDto)
  slots!: AvailabilitySlotDto[];
}

/** Set (replace) a caregiver's availability for one or more days. */
export class SetCaregiverAvailabilityDto {
  @ApiProperty({ type: [AvailabilityDayDto] })
  @IsArray()
  @ArrayMaxSize(31)
  @ValidateNested({ each: true })
  @Type(() => AvailabilityDayDto)
  days!: AvailabilityDayDto[];
}
