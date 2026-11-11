import { Inject, Injectable } from '@nestjs/common';
import { NotFoundDomainException, ValidationException } from '@shared/domain/domain-exception';
import { ACCESS_ROLE_REPOSITORY, AccessRoleRepository } from '../../domain/access-role.repository';
import {
  ADMIN_USER_DIRECTORY,
  AdminAuthRole,
  AdminUserDirectory,
  AdminUserStatus,
} from '../ports/admin-user-directory.port';
import { AdminUserResult, UsersScreenResult, toAdminUserResult } from '../dto/users-screen.result';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export interface ListAdminUsersCommand {
  search?: string | null;
  roleId?: string | null;
  branchId?: string | null;
  status?: AdminUserStatus | null;
  page?: number;
  pageSize?: number;
}

/** Map a role's coarse system key to the auth role claim, defaulting to least privilege. */
function authRoleFor(systemKey: string | null): AdminAuthRole {
  if (systemKey === 'SUPER_ADMIN' || systemKey === 'OPERATIONS_MANAGER') {
    return systemKey;
  }
  return 'COORDINATOR';
}

/** Use case: the Users tab list with search, role, branch and status filters. */
@Injectable()
export class ListAdminUsersUseCase {
  constructor(@Inject(ADMIN_USER_DIRECTORY) private readonly directory: AdminUserDirectory) {}

  async execute(command: ListAdminUsersCommand): Promise<UsersScreenResult> {
    const page = command.page && command.page > 0 ? command.page : 1;
    const pageSize = Math.min(
      command.pageSize && command.pageSize > 0 ? command.pageSize : DEFAULT_PAGE_SIZE,
      MAX_PAGE_SIZE,
    );
    const { rows, total } = await this.directory.list({
      search: command.search?.trim() || null,
      roleId: command.roleId ?? null,
      branchId: command.branchId ?? null,
      status: command.status ?? null,
      page,
      pageSize,
    });
    return { users: rows.map(toAdminUserResult), total, page, pageSize };
  }
}

export interface UpdateAdminUserCommand {
  userId: string;
  roleId?: string;
  branchId?: string | null;
  status?: AdminUserStatus;
}

/** Use case: change a user's role, branch or status. */
@Injectable()
export class UpdateAdminUserUseCase {
  constructor(
    @Inject(ADMIN_USER_DIRECTORY) private readonly directory: AdminUserDirectory,
    @Inject(ACCESS_ROLE_REPOSITORY) private readonly roles: AccessRoleRepository,
  ) {}

  async execute(command: UpdateAdminUserCommand): Promise<AdminUserResult> {
    const existing = await this.directory.findById(command.userId);
    if (existing === null) {
      throw new NotFoundDomainException('User not found');
    }

    let authRole: AdminAuthRole | undefined;
    if (command.roleId !== undefined) {
      const role = await this.roles.findById(command.roleId);
      if (role === null) {
        throw new ValidationException('The selected role does not exist');
      }
      authRole = authRoleFor(role.systemKey);
    }
    if (command.branchId) {
      const branchOk = await this.directory.branchExists(command.branchId);
      if (!branchOk) {
        throw new ValidationException('The selected branch does not exist');
      }
    }

    await this.directory.updateAssignment(command.userId, {
      roleId: command.roleId,
      branchId: command.branchId,
      status: command.status,
      authRole,
    });

    const updated = await this.directory.findById(command.userId);
    if (updated === null) {
      throw new NotFoundDomainException('User not found');
    }
    return toAdminUserResult(updated);
  }
}

export interface DeleteAdminUserCommand {
  userId: string;
}

/** Use case: remove a back office user account. */
@Injectable()
export class DeleteAdminUserUseCase {
  constructor(@Inject(ADMIN_USER_DIRECTORY) private readonly directory: AdminUserDirectory) {}

  async execute(command: DeleteAdminUserCommand): Promise<void> {
    const existing = await this.directory.findById(command.userId);
    if (existing === null) {
      throw new NotFoundDomainException('User not found');
    }
    await this.directory.delete(command.userId);
  }
}

export { authRoleFor };
