import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InvitationStatus } from '../../domain/invitation-status.enum';
import { AdminUserResult, UsersScreenResult } from '../../application/dto/users-screen.result';
import { RoleResult } from '../../application/dto/role.result';
import { PermissionsMatrixResult } from '../../application/dto/permissions-matrix.result';
import {
  InvitationResult,
  InvitationWithTokenResult,
} from '../../application/dto/invitation.result';
import { AcceptInvitationResult } from '../../application/use-cases/accept-invitation.use-case';
import { ProvisionedAdminResult } from '../../application/use-cases/invitations.use-cases';

export class AdminUserResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() firstName!: string;
  @ApiProperty() lastName!: string;
  @ApiProperty() fullName!: string;
  @ApiProperty() email!: string;
  @ApiProperty({ nullable: true }) roleId!: string | null;
  @ApiProperty({ nullable: true }) roleName!: string | null;
  @ApiProperty({ nullable: true }) branchId!: string | null;
  @ApiProperty({ nullable: true }) branchName!: string | null;
  @ApiProperty() status!: string;
  @ApiProperty({ nullable: true }) lastActiveAt!: Date | null;
  @ApiProperty({ nullable: true }) photoKey!: string | null;

  static fromResult(result: AdminUserResult): AdminUserResponseDto {
    return Object.assign(new AdminUserResponseDto(), result);
  }
}

export class UsersScreenResponseDto {
  @ApiProperty({ type: [AdminUserResponseDto] }) users!: AdminUserResponseDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;

  static fromResult(result: UsersScreenResult): UsersScreenResponseDto {
    return {
      users: result.users.map((user) => AdminUserResponseDto.fromResult(user)),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    };
  }
}

export class RoleResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ nullable: true }) description!: string | null;
  @ApiProperty() isSystem!: boolean;
  @ApiProperty({ type: [String] }) permissions!: string[];
  @ApiProperty() permissionCount!: number;
  @ApiProperty() userCount!: number;

  static fromResult(result: RoleResult): RoleResponseDto {
    return Object.assign(new RoleResponseDto(), result);
  }
}

export class PermissionsMatrixResponseDto {
  @ApiProperty() categories!: PermissionsMatrixResult['categories'];
  @ApiProperty() roles!: PermissionsMatrixResult['roles'];

  static fromResult(result: PermissionsMatrixResult): PermissionsMatrixResponseDto {
    return Object.assign(new PermissionsMatrixResponseDto(), result);
  }
}

export class InvitationResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() email!: string;
  @ApiProperty() firstName!: string;
  @ApiProperty() lastName!: string;
  @ApiProperty() fullName!: string;
  @ApiPropertyOptional({ nullable: true }) phoneNumber!: string | null;
  @ApiPropertyOptional({ nullable: true }) department!: string | null;
  @ApiProperty() roleId!: string;
  @ApiProperty({ nullable: true }) branchId!: string | null;
  @ApiProperty({ enum: InvitationStatus }) status!: InvitationStatus;
  @ApiProperty() expiresAt!: Date;
  @ApiProperty({ nullable: true }) invitedByAdminId!: string | null;
  @ApiProperty() createdAt!: Date;

  static fromResult(result: InvitationResult): InvitationResponseDto {
    return Object.assign(new InvitationResponseDto(), result);
  }
}

export class InvitationWithTokenResponseDto extends InvitationResponseDto {
  @ApiProperty({ description: 'The one time token, returned once (email delivery deferred)' })
  token!: string;

  static fromTokenResult(result: InvitationWithTokenResult): InvitationWithTokenResponseDto {
    return Object.assign(new InvitationWithTokenResponseDto(), result);
  }
}

export class ProvisionedAdminResponseDto {
  @ApiProperty() userId!: string;
  @ApiProperty() email!: string;

  @ApiProperty({
    description:
      'The temporary password, returned once (email delivery deferred). The account must change it on first login.',
  })
  temporaryPassword!: string;
}

/**
 * The result of the Invite User action. Either a pending invitation with its one
 * time token (`mode = INVITED`), or an account provisioned immediately with a
 * temporary password (`mode = PROVISIONED`), depending on the welcome email toggle.
 */
export class CreateInvitationResponseDto {
  @ApiProperty({ enum: ['INVITED', 'PROVISIONED'] }) mode!: 'INVITED' | 'PROVISIONED';
  @ApiPropertyOptional({ type: InvitationWithTokenResponseDto })
  invitation?: InvitationWithTokenResponseDto;
  @ApiPropertyOptional({ type: ProvisionedAdminResponseDto })
  provisioned?: ProvisionedAdminResponseDto;

  static fromInvitation(result: InvitationWithTokenResult): CreateInvitationResponseDto {
    const dto = new CreateInvitationResponseDto();
    dto.mode = 'INVITED';
    dto.invitation = InvitationWithTokenResponseDto.fromTokenResult(result);
    return dto;
  }

  static fromProvisioned(result: ProvisionedAdminResult): CreateInvitationResponseDto {
    const dto = new CreateInvitationResponseDto();
    dto.mode = 'PROVISIONED';
    dto.provisioned = Object.assign(new ProvisionedAdminResponseDto(), result);
    return dto;
  }
}

export class AcceptInvitationResponseDto {
  @ApiProperty() userId!: string;
  @ApiProperty() email!: string;

  static fromResult(result: AcceptInvitationResult): AcceptInvitationResponseDto {
    return Object.assign(new AcceptInvitationResponseDto(), result);
  }
}
