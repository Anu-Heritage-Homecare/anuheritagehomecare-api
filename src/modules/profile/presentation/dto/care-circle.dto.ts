import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import {
  CareCircleMemberView,
  CareCircleView,
  CareCodePreviewResult,
  CareCodeView,
  PendingCareRequestView,
  PendingCareRequestsView,
  RedeemCareCodeResult,
} from '../../application/use-cases/care-circle.use-cases';

const ACCESS_LEVELS = ['LIMITED', 'VIEW_ONLY', 'FULL'];

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

/**
 * Request to approve a pending join request. Both fields are optional: omitting
 * the access level keeps the least privileged default, which the owner can raise
 * later from the member's permissions.
 */
export class ApproveMemberRequestDto {
  @ApiProperty({ required: false, enum: ACCESS_LEVELS, example: 'LIMITED' })
  @IsOptional()
  @IsIn(ACCESS_LEVELS)
  accessLevel?: string;

  @ApiProperty({ required: false, example: 'Daughter', maxLength: 120 })
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

/** HTTP response after redeeming a code: whose circle the request was sent to. */
export class RedeemCareCodeResponseDto {
  @ApiProperty({ example: 'Joseph Simon' })
  ownerName!: string;

  @ApiProperty({
    description: 'True when the caller already had a membership or request (idempotent redeem)',
  })
  alreadyMember!: boolean;

  @ApiProperty({
    description:
      'True while the request is awaiting the owner approval; the member has no access yet',
  })
  pending!: boolean;

  static fromResult(result: RedeemCareCodeResult): RedeemCareCodeResponseDto {
    return Object.assign(new RedeemCareCodeResponseDto(), result);
  }
}

/** One pending join request shown on the owner's Pending Invitations screen. */
class PendingCareRequestDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() relationship!: string;
  @ApiProperty({ nullable: true }) photoUrl!: string | null;
  @ApiProperty({ example: '2026-09-13T00:00:00.000Z' }) requestedAt!: string;

  static from(view: PendingCareRequestView): PendingCareRequestDto {
    return Object.assign(new PendingCareRequestDto(), view);
  }
}

/** HTTP response listing the owner's pending care circle join requests. */
export class PendingCareRequestsResponseDto {
  @ApiProperty({ type: [PendingCareRequestDto] })
  requests!: PendingCareRequestDto[];

  static fromView(view: PendingCareRequestsView): PendingCareRequestsResponseDto {
    const dto = new PendingCareRequestsResponseDto();
    dto.requests = view.requests.map((r) => PendingCareRequestDto.from(r));
    return dto;
  }
}
