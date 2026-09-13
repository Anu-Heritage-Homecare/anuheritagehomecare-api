import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  ALL_FAMILY_ACCESS_LEVELS,
  FamilyAccessLevel,
} from '@modules/family-contacts/domain/family-access-level.enum';
import {
  ALL_FAMILY_COMMUNICATION_TYPES,
  FamilyCommunicationType,
} from '@modules/family-contacts/domain/family-communication-type.enum';
import {
  ALL_FAMILY_CONTACT_ROLES,
  FamilyContactRole,
} from '@modules/family-contacts/domain/family-contact-role.enum';
import {
  ALL_FAMILY_PREFERRED_CONTACT_METHODS,
  FamilyPreferredContactMethod,
} from '@modules/family-contacts/domain/family-preferred-contact-method.enum';

export class FamilyContactRequestDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(200) name!: string;

  @ApiProperty({ description: 'How they relate to the recipient, for example "Son"' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  relationship!: string;

  @ApiPropertyOptional({ enum: ALL_FAMILY_CONTACT_ROLES, isArray: true })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(7)
  @IsIn(ALL_FAMILY_CONTACT_ROLES, { each: true })
  roles?: FamilyContactRole[];

  @ApiPropertyOptional({ description: 'A qualifier for the roles, for example "weekends"' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  roleNote?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) address?: string;

  @ApiPropertyOptional({ enum: ALL_FAMILY_ACCESS_LEVELS })
  @IsOptional()
  @IsIn(ALL_FAMILY_ACCESS_LEVELS)
  accessLevel?: FamilyAccessLevel;

  @ApiPropertyOptional({ description: 'A short scope qualifier, for example "All Records"' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  accessScopeLabel?: string;

  @ApiPropertyOptional({ description: 'The clinical sections this contact may see' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  authorizedSectionsLabel?: string;

  @ApiPropertyOptional({ enum: ALL_FAMILY_PREFERRED_CONTACT_METHODS })
  @IsOptional()
  @IsIn(ALL_FAMILY_PREFERRED_CONTACT_METHODS)
  preferredMethod?: FamilyPreferredContactMethod;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() portalLoginEnabled?: boolean;
}

export class LogFamilyCommunicationRequestDto {
  @ApiProperty({ description: 'The family contact this interaction was with' })
  @IsUUID()
  contactId!: string;

  @ApiProperty({ enum: ALL_FAMILY_COMMUNICATION_TYPES })
  @IsIn(ALL_FAMILY_COMMUNICATION_TYPES)
  type!: FamilyCommunicationType;

  @ApiProperty() @IsString() @MinLength(1) @MaxLength(300) subject!: string;

  @ApiProperty({ description: 'The staff member who handled the interaction' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  staffMemberName!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  @IsISO8601()
  occurredAt!: string;
}
