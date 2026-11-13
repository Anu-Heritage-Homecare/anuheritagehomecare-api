import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminJwtAuthGuard } from '@shared/presentation/admin-jwt-auth.guard';
import { AdminPrincipal } from '@shared/presentation/admin-principal';
import { CurrentAdmin } from '@shared/presentation/current-admin.decorator';
import { GetPermissionsMatrixUseCase } from '../application/use-cases/get-permissions-matrix.use-case';
import {
  CreateInvitationUseCase,
  ListInvitationsUseCase,
  ProvisionAdminUserUseCase,
  ResendInvitationUseCase,
  RevokeInvitationUseCase,
} from '../application/use-cases/invitations.use-cases';
import {
  CreateRoleUseCase,
  DeleteRoleUseCase,
  ListRolesUseCase,
  SetRolePermissionsUseCase,
  UpdateRoleUseCase,
} from '../application/use-cases/roles.use-cases';
import {
  DeleteAdminUserUseCase,
  ListAdminUsersUseCase,
  UpdateAdminUserUseCase,
} from '../application/use-cases/users.use-cases';
import {
  CreateInvitationRequestDto,
  CreateRoleRequestDto,
  ListInvitationsQueryDto,
  ListUsersQueryDto,
  SetRolePermissionsRequestDto,
  UpdateRoleRequestDto,
  UpdateUserRequestDto,
} from './dto/admin-access-request.dto';
import {
  AdminUserResponseDto,
  CreateInvitationResponseDto,
  InvitationResponseDto,
  InvitationWithTokenResponseDto,
  PermissionsMatrixResponseDto,
  RoleResponseDto,
  UsersScreenResponseDto,
} from './dto/admin-access-response.dto';

/**
 * Settings > Users & Permissions (admin staff only). The Users, Roles,
 * Permissions and Invitations tabs. Every route requires a valid admin token.
 * Permission enforcement per route is deferred until the matrix is wired into the
 * guard; the screen manages the configurable roles and their granted keys today.
 */
@ApiTags('admin-access')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard)
@Controller({ path: 'admin', version: '1' })
export class AdminAccessController {
  constructor(
    private readonly listUsers: ListAdminUsersUseCase,
    private readonly updateUser: UpdateAdminUserUseCase,
    private readonly deleteUser: DeleteAdminUserUseCase,
    private readonly listRoles: ListRolesUseCase,
    private readonly createRole: CreateRoleUseCase,
    private readonly updateRole: UpdateRoleUseCase,
    private readonly setRolePermissions: SetRolePermissionsUseCase,
    private readonly deleteRole: DeleteRoleUseCase,
    private readonly getPermissions: GetPermissionsMatrixUseCase,
    private readonly listInvitations: ListInvitationsUseCase,
    private readonly createInvitation: CreateInvitationUseCase,
    private readonly provisionAdminUser: ProvisionAdminUserUseCase,
    private readonly resendInvitation: ResendInvitationUseCase,
    private readonly revokeInvitation: RevokeInvitationUseCase,
  ) {}

  @Get('users')
  @ApiOperation({ summary: 'The Users tab: admin accounts with search and filters' })
  @ApiOkResponse({ type: UsersScreenResponseDto })
  async users(@Query() query: ListUsersQueryDto): Promise<UsersScreenResponseDto> {
    const result = await this.listUsers.execute({
      search: query.search,
      roleId: query.roleId,
      branchId: query.branchId,
      status: query.status,
      page: query.page,
      pageSize: query.pageSize,
    });
    return UsersScreenResponseDto.fromResult(result);
  }

  @Patch('users/:id')
  @ApiOperation({ summary: "Change a user's role, branch or status" })
  @ApiOkResponse({ type: AdminUserResponseDto })
  async editUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateUserRequestDto,
  ): Promise<AdminUserResponseDto> {
    const result = await this.updateUser.execute({
      userId: id,
      roleId: body.roleId,
      branchId: body.branchId,
      status: body.status,
    });
    return AdminUserResponseDto.fromResult(result);
  }

  @Delete('users/:id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Remove a user account' })
  async removeUser(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.deleteUser.execute({ userId: id });
  }

  @Get('roles')
  @ApiOperation({ summary: 'The Roles tab: roles with their user counts' })
  @ApiOkResponse({ type: [RoleResponseDto] })
  async roles(): Promise<RoleResponseDto[]> {
    const result = await this.listRoles.execute();
    return result.map((role) => RoleResponseDto.fromResult(role));
  }

  @Post('roles')
  @ApiOperation({ summary: 'Create a custom role' })
  @ApiOkResponse({ type: RoleResponseDto })
  async addRole(@Body() body: CreateRoleRequestDto): Promise<RoleResponseDto> {
    const result = await this.createRole.execute({
      name: body.name,
      description: body.description,
      baseRoleId: body.baseRoleId,
      permissions: body.permissions,
    });
    return RoleResponseDto.fromResult(result);
  }

  @Patch('roles/:id')
  @ApiOperation({ summary: "Revise a role's details and/or permissions" })
  @ApiOkResponse({ type: RoleResponseDto })
  async editRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateRoleRequestDto,
  ): Promise<RoleResponseDto> {
    const result = await this.updateRole.execute({
      roleId: id,
      name: body.name,
      description: body.description,
      permissions: body.permissions,
    });
    return RoleResponseDto.fromResult(result);
  }

  @Put('roles/:id/permissions')
  @ApiOperation({ summary: "Replace a role's granted permissions (the Permissions tab)" })
  @ApiOkResponse({ type: RoleResponseDto })
  async rolePermissions(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: SetRolePermissionsRequestDto,
  ): Promise<RoleResponseDto> {
    const result = await this.setRolePermissions.execute({
      roleId: id,
      permissions: body.permissions,
    });
    return RoleResponseDto.fromResult(result);
  }

  @Delete('roles/:id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a custom role with no users' })
  async removeRole(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.deleteRole.execute({ roleId: id });
  }

  @Get('permissions')
  @ApiOperation({ summary: 'The Permissions tab: the catalog and each role grants' })
  @ApiOkResponse({ type: PermissionsMatrixResponseDto })
  async permissions(): Promise<PermissionsMatrixResponseDto> {
    const result = await this.getPermissions.execute();
    return PermissionsMatrixResponseDto.fromResult(result);
  }

  @Get('invitations')
  @ApiOperation({ summary: 'The Invitations tab' })
  @ApiOkResponse({ type: [InvitationResponseDto] })
  async invitations(@Query() query: ListInvitationsQueryDto): Promise<InvitationResponseDto[]> {
    const result = await this.listInvitations.execute(query.status ?? null);
    return result.map((invitation) => InvitationResponseDto.fromResult(invitation));
  }

  @Post('invitations')
  @ApiOperation({ summary: 'Invite a new back office user (the Invite User action)' })
  @ApiOkResponse({ type: CreateInvitationResponseDto })
  async invite(
    @Body() body: CreateInvitationRequestDto,
    @CurrentAdmin() admin: AdminPrincipal,
  ): Promise<CreateInvitationResponseDto> {
    // The welcome email toggle is checked by default: provision immediately with a
    // temporary password unless the inviter opts into the invitation link flow.
    if (body.sendWelcomeEmail ?? true) {
      const provisioned = await this.provisionAdminUser.execute({
        email: body.email,
        firstName: body.firstName,
        lastName: body.lastName,
        phoneNumber: body.phoneNumber,
        department: body.department,
        roleId: body.roleId,
        branchId: body.branchId,
      });
      return CreateInvitationResponseDto.fromProvisioned(provisioned);
    }
    const invitation = await this.createInvitation.execute({
      email: body.email,
      firstName: body.firstName,
      lastName: body.lastName,
      phoneNumber: body.phoneNumber,
      department: body.department,
      roleId: body.roleId,
      branchId: body.branchId,
      invitedByAdminId: admin.adminUserId,
    });
    return CreateInvitationResponseDto.fromInvitation(invitation);
  }

  @Post('invitations/:id/resend')
  @ApiOperation({ summary: "Reissue a pending invitation's token" })
  @ApiOkResponse({ type: InvitationWithTokenResponseDto })
  async resend(@Param('id', ParseUUIDPipe) id: string): Promise<InvitationWithTokenResponseDto> {
    const result = await this.resendInvitation.execute({ invitationId: id });
    return InvitationWithTokenResponseDto.fromTokenResult(result);
  }

  @Post('invitations/:id/revoke')
  @ApiOperation({ summary: 'Revoke a pending invitation' })
  @ApiOkResponse({ type: InvitationResponseDto })
  async revoke(@Param('id', ParseUUIDPipe) id: string): Promise<InvitationResponseDto> {
    const result = await this.revokeInvitation.execute({ invitationId: id });
    return InvitationResponseDto.fromResult(result);
  }
}
