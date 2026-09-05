import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsIn, IsString, MaxLength, MinLength } from 'class-validator';
import {
  CareCircleInvitationView,
  CareCircleMemberView,
  CareCircleView,
} from '../../application/use-cases/care-circle.use-cases';

const ACCESS_LEVELS = ['LIMITED', 'VIEW_ONLY', 'FULL'];

/** Request to invite a person to the care circle by email at an access level. */
export class InviteCareCircleMemberRequestDto {
  @ApiProperty({ example: 'james.anderson@email.com', maxLength: 255 })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiProperty({ example: 'Brother', maxLength: 120 })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  relationship!: string;

  @ApiProperty({ enum: ACCESS_LEVELS, example: 'VIEW_ONLY' })
  @IsIn(ACCESS_LEVELS)
  accessLevel!: string;
}

/** Request to accept a care circle invitation. */
export class AcceptInvitationRequestDto {
  @ApiProperty({ description: 'The invitation token from the invite' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  token!: string;
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

export class CareCircleInvitationResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() email!: string;
  @ApiProperty() relationship!: string;
  @ApiProperty({ enum: ACCESS_LEVELS }) accessLevel!: string;
  @ApiProperty() invitedAt!: string;

  static from(view: CareCircleInvitationView): CareCircleInvitationResponseDto {
    return Object.assign(new CareCircleInvitationResponseDto(), view);
  }
}

/** HTTP response for the care circle: members plus pending invitations. */
export class CareCircleResponseDto {
  @ApiProperty({ type: [CareCircleMemberDto] })
  members!: CareCircleMemberDto[];

  @ApiProperty({ type: [CareCircleInvitationResponseDto] })
  pendingInvitations!: CareCircleInvitationResponseDto[];

  static fromView(view: CareCircleView): CareCircleResponseDto {
    const dto = new CareCircleResponseDto();
    dto.members = view.members.map((m) => CareCircleMemberDto.from(m));
    dto.pendingInvitations = view.pendingInvitations.map((i) =>
      CareCircleInvitationResponseDto.from(i),
    );
    return dto;
  }
}
