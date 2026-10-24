import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import {
  CareCircleMemberView,
  CareCircleView,
  CareCodePreviewResult,
  CareCodeView,
  RedeemCareCodeResult,
  RegisterAndLinkResult,
} from '../../application/use-cases/care-circle.use-cases';

const ACCESS_LEVELS = ['LIMITED', 'VIEW_ONLY', 'FULL'];
const COUNTRIES = ['US', 'NG'];

/** Request to redeem a care code and join the sharing owner's circle. */
export class RedeemCareCodeRequestDto {
  @ApiProperty({ example: 'CARE-7319-KLM2', maxLength: 40 })
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  code!: string;

  @ApiProperty({
    required: false,
    example: 'Daughter',
    maxLength: 120,
    description: 'The joiner self chosen relationship; the owner may correct it later',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  relationship?: string;
}

/**
 * Request for the access code activation screen a person with no account uses:
 * register a new member account and join the care code's circle in one step.
 */
export class RegisterAndLinkRequestDto {
  @ApiProperty({ example: 'CARE-7319-KLM2', maxLength: 40 })
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  code!: string;

  @ApiProperty({ example: 'Daughter', maxLength: 120 })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  relationship!: string;

  @ApiProperty({ example: 'Grace', maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName!: string;

  @ApiProperty({ example: 'Simon', maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName!: string;

  @ApiProperty({ example: 'grace.simon@example.com', maxLength: 255 })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiProperty({ example: '+2348031234567', maxLength: 20 })
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  phone!: string;

  @ApiProperty({ example: '12 Marina Road', maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  addressLine1!: string;

  @ApiProperty({ required: false, example: 'Apartment 4', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  addressLine2?: string;

  @ApiProperty({ example: 'Lagos', maxLength: 120 })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  city!: string;

  @ApiProperty({ example: 'Lagos', maxLength: 120 })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  state!: string;

  @ApiProperty({ example: '101233', maxLength: 20 })
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  postalCode!: string;

  @ApiProperty({ enum: COUNTRIES, example: 'NG' })
  @IsIn(COUNTRIES)
  country!: string;

  @ApiProperty({ example: 'S3curePass', minLength: 8, maxLength: 128 })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}

/** Request to set a member's permissions (and optionally their relationship). */
export class SetMemberAccessRequestDto {
  @ApiProperty({ enum: ACCESS_LEVELS, example: 'VIEW_ONLY' })
  @IsIn(ACCESS_LEVELS)
  accessLevel!: string;

  @ApiProperty({ required: false, example: 'Brother', maxLength: 120 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  relationship?: string;
}

class CareCircleMemberDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() relationship!: string;
  @ApiProperty({ enum: ACCESS_LEVELS }) accessLevel!: string;
  @ApiProperty({ nullable: true }) photoUrl!: string | null;
  @ApiProperty() isOwner!: boolean;

  static from(view: CareCircleMemberView): CareCircleMemberDto {
    return Object.assign(new CareCircleMemberDto(), view);
  }
}

/** HTTP response for the care circle: the owner plus accepted members. */
export class CareCircleResponseDto {
  @ApiProperty({ type: [CareCircleMemberDto] })
  members!: CareCircleMemberDto[];

  static fromView(view: CareCircleView): CareCircleResponseDto {
    const dto = new CareCircleResponseDto();
    dto.members = view.members.map((m) => CareCircleMemberDto.from(m));
    return dto;
  }
}

/** HTTP response carrying the owner's shareable care code and its expiry. */
export class CareCodeResponseDto {
  @ApiProperty({ example: 'CARE-7319-KLM2' })
  code!: string;

  @ApiProperty({ example: '2026-09-13T00:00:00.000Z' })
  expiresAt!: string;

  static fromView(view: CareCodeView): CareCodeResponseDto {
    return Object.assign(new CareCodeResponseDto(), view);
  }
}

/** HTTP response previewing a care code before joining: whose circle it is. */
export class CareCirclePreviewResponseDto {
  @ApiProperty({ example: 'Joseph Simon' })
  ownerName!: string;

  @ApiProperty({ nullable: true, description: "The owner's avatar URL, or null when none is set" })
  ownerPhotoUrl!: string | null;

  static fromResult(result: CareCodePreviewResult): CareCirclePreviewResponseDto {
    return Object.assign(new CareCirclePreviewResponseDto(), result);
  }
}

/** HTTP response after redeeming a code: whose circle was joined. */
export class RedeemCareCodeResponseDto {
  @ApiProperty({ example: 'Joseph Simon' })
  ownerName!: string;

  @ApiProperty({ description: 'True when the caller was already a member (idempotent redeem)' })
  alreadyMember!: boolean;

  static fromResult(result: RedeemCareCodeResult): RedeemCareCodeResponseDto {
    return Object.assign(new RedeemCareCodeResponseDto(), result);
  }
}

/** HTTP response after registering and linking: the new account and whose circle it joined. */
export class RegisterAndLinkResponseDto {
  @ApiProperty({ example: '8f3b2c1a-0d9e-4a7b-9c6d-1e2f3a4b5c6d' })
  userId!: string;

  @ApiProperty({ example: 'Joseph Simon' })
  ownerName!: string;

  @ApiProperty({
    example: true,
    description: 'Always true: verify the email before the account can log in',
  })
  emailVerificationRequired!: boolean;

  static fromResult(result: RegisterAndLinkResult): RegisterAndLinkResponseDto {
    return Object.assign(new RegisterAndLinkResponseDto(), result);
  }
}
