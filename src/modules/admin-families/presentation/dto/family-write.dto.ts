import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FamilyMemberStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';

const STATUSES = Object.values(FamilyMemberStatus);

/** The captured details of a family member added as a contact. */
export class FamilyContactDto {
  @ApiProperty() @IsString() @MaxLength(200) fullName!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() @MaxLength(255) email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) relationship?: string;
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  primaryRecipientId?: string;
}

/** Bulk import of family members as contacts. */
export class ImportFamiliesRequestDto {
  @ApiProperty({ type: [FamilyContactDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => FamilyContactDto)
  families!: FamilyContactDto[];
}

/** Set the quick notes on a family member. */
export class FamilyNotesRequestDto {
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  quickNotes?: string | null;
}

/** Set the account status of a family member. */
export class FamilyStatusRequestDto {
  @ApiProperty({ enum: STATUSES })
  @IsIn(STATUSES)
  status!: FamilyMemberStatus;
}

/** Set the emergency contact verified flag. */
export class FamilyEmergencyVerifiedRequestDto {
  @ApiProperty() @IsBoolean() verified!: boolean;
}

/** Link (or clear) the primary recipient of a family member. */
export class FamilyPrimaryRecipientRequestDto {
  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  recipientId?: string | null;
}

/** Bulk edit the status of selected family members. */
export class BulkEditFamiliesRequestDto {
  @ApiProperty({ type: [String], format: 'uuid', maxItems: 200 })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @IsUUID('4', { each: true })
  ids!: string[];

  @ApiProperty({ enum: STATUSES })
  @IsIn(STATUSES)
  status!: FamilyMemberStatus;
}
