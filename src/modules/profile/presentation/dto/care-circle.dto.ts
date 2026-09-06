import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import {
  CareCircleMemberView,
  CareCircleView,
  CareCodeView,
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
