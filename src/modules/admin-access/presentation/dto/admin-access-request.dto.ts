import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { InvitationStatus } from '../../domain/invitation-status.enum';

const STATUSES = ['ACTIVE', 'SUSPENDED'] as const;
const MAX_PERMISSIONS = 100;

/** Filters for the Users tab list. */
export class ListUsersQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) search?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() roleId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() branchId?: string;

  @ApiPropertyOptional({ enum: STATUSES })
  @IsOptional()
  @IsIn(STATUSES)
  status?: (typeof STATUSES)[number];

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}

/** Change a user's role, branch or status. */
export class UpdateUserRequestDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() roleId?: string;

  @ApiPropertyOptional({ nullable: true, description: 'A branch id, or null to clear the branch' })
  @IsOptional()
  @ValidateIf((object: UpdateUserRequestDto) => object.branchId !== null)
  @IsUUID()
  branchId?: string | null;

  @ApiPropertyOptional({ enum: STATUSES })
  @IsOptional()
  @IsIn(STATUSES)
  status?: (typeof STATUSES)[number];
}

/** Create a custom role. */
export class CreateRoleRequestDto {
  @ApiProperty({ example: 'Clinical Coordinator' })
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) description?: string;

  @ApiPropertyOptional({
    description: 'A role to copy permissions from as the starting set (the Base Template)',
  })
  @IsOptional()
  @IsUUID()
  baseRoleId?: string;

  @ApiPropertyOptional({ type: [String], description: 'Granted permission keys' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_PERMISSIONS)
  @IsString({ each: true })
  permissions?: string[];
}

/** Revise a role's details and/or permissions. */
export class UpdateRoleRequestDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(1) @MaxLength(80) name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) description?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_PERMISSIONS)
  @IsString({ each: true })
  permissions?: string[];
}

/** Replace a role's granted permissions (the Permissions tab). */
export class SetRolePermissionsRequestDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMaxSize(MAX_PERMISSIONS)
  @IsString({ each: true })
  permissions!: string[];
}

/** Invite a new back office user. */
export class CreateInvitationRequestDto {
  @ApiProperty({ example: 'taiwo@careprofs.ng' }) @IsEmail() @MaxLength(255) email!: string;
  @ApiProperty({ example: 'Taiwo' }) @IsString() @MinLength(1) @MaxLength(100) firstName!: string;
  @ApiProperty({ example: 'Ogunleye' }) @IsString() @MinLength(1) @MaxLength(100) lastName!: string;

  @ApiPropertyOptional({ example: '+234 801 234 5678' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  phoneNumber?: string;

  @ApiPropertyOptional({ description: 'Free text department', example: 'Operations' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  department?: string;

  @ApiProperty() @IsUUID() roleId!: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() branchId?: string;

  @ApiPropertyOptional({
    default: true,
    description:
      'When true (the default), provision the account now with a temporary password that must be changed on first login, instead of sending an invitation link',
  })
  @IsOptional()
  @IsBoolean()
  sendWelcomeEmail?: boolean;
}

/** Filter invitations by status. */
export class ListInvitationsQueryDto {
  @ApiPropertyOptional({ enum: InvitationStatus })
  @IsOptional()
  @IsIn(Object.values(InvitationStatus))
  status?: InvitationStatus;
}

/** Accept an invitation and set a password (public). */
export class AcceptInvitationRequestDto {
  @ApiProperty({ description: 'The one time token from the invitation link' })
  @IsString()
  @MinLength(1)
  @MaxLength(512)
  token!: string;

  @ApiProperty({ example: 'Str0ngPass' }) @IsString() @MaxLength(128) password!: string;
}
