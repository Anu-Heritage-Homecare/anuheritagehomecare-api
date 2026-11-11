import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import { NotFoundDomainException, ValidationException } from '@shared/domain/domain-exception';
import { AccessRole } from '../../domain/access-role.entity';
import { ACCESS_ROLE_REPOSITORY, AccessRoleRepository } from '../../domain/access-role.repository';
import { ADMIN_USER_DIRECTORY, AdminUserDirectory } from '../ports/admin-user-directory.port';
import { RoleResult, toRoleResult } from '../dto/role.result';

async function assertNameFree(
  roles: AccessRoleRepository,
  name: string,
  exceptId: string | null,
): Promise<void> {
  const existing = await roles.findByName(name.trim());
  if (existing !== null && existing.id !== exceptId) {
    throw new ValidationException('A role with this name already exists');
  }
}

/** Use case: list roles with their user counts (the Roles tab). */
@Injectable()
export class ListRolesUseCase {
  constructor(
    @Inject(ACCESS_ROLE_REPOSITORY) private readonly roles: AccessRoleRepository,
    @Inject(ADMIN_USER_DIRECTORY) private readonly directory: AdminUserDirectory,
  ) {}

  async execute(): Promise<RoleResult[]> {
    const [roles, counts] = await Promise.all([this.roles.list(), this.directory.countsByRole()]);
    return roles.map((role) => toRoleResult(role, counts.get(role.id) ?? 0));
  }
}

export interface CreateRoleCommand {
  name: string;
  description?: string | null;
  permissions?: string[];
  /** Optional role to copy permissions from as the starting set (the Base Template). */
  baseRoleId?: string | null;
}

/** Use case: create a custom role. */
@Injectable()
export class CreateRoleUseCase {
  constructor(
    @Inject(ACCESS_ROLE_REPOSITORY) private readonly roles: AccessRoleRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
  ) {}

  async execute(command: CreateRoleCommand): Promise<RoleResult> {
    await assertNameFree(this.roles, command.name, null);
    const base = await this.resolveBasePermissions(command.baseRoleId);
    const role = AccessRole.create({
      id: this.ids.generate(),
      name: command.name,
      description: command.description,
      // The base template's permissions seed the grant; explicit keys union on top.
      permissions: [...base, ...(command.permissions ?? [])],
      now: this.clock.now(),
    });
    await this.roles.save(role);
    return toRoleResult(role, 0);
  }

  private async resolveBasePermissions(baseRoleId: string | null | undefined): Promise<string[]> {
    if (!baseRoleId) {
      return [];
    }
    const base = await this.roles.findById(baseRoleId);
    if (base === null) {
      throw new ValidationException('The base template role does not exist');
    }
    return [...base.permissions];
  }
}

export interface UpdateRoleCommand {
  roleId: string;
  name?: string;
  description?: string | null;
  permissions?: string[];
}

/** Use case: edit a role's details and/or granted permissions. */
@Injectable()
export class UpdateRoleUseCase {
  constructor(
    @Inject(ACCESS_ROLE_REPOSITORY) private readonly roles: AccessRoleRepository,
    @Inject(ADMIN_USER_DIRECTORY) private readonly directory: AdminUserDirectory,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: UpdateRoleCommand): Promise<RoleResult> {
    const role = await this.roles.findById(command.roleId);
    if (role === null) {
      throw new NotFoundDomainException('Role not found');
    }
    const now = this.clock.now();
    if (command.name !== undefined) {
      await assertNameFree(this.roles, command.name, role.id);
    }
    if (command.name !== undefined || command.description !== undefined) {
      role.editDetails({ name: command.name, description: command.description }, now);
    }
    if (command.permissions !== undefined) {
      role.setPermissions(command.permissions, now);
    }
    await this.roles.save(role);
    const counts = await this.directory.countsByRole();
    return toRoleResult(role, counts.get(role.id) ?? 0);
  }
}

export interface SetRolePermissionsCommand {
  roleId: string;
  permissions: string[];
}

/** Use case: replace a role's granted permissions (the Permissions tab toggles). */
@Injectable()
export class SetRolePermissionsUseCase {
  constructor(
    @Inject(ACCESS_ROLE_REPOSITORY) private readonly roles: AccessRoleRepository,
    @Inject(ADMIN_USER_DIRECTORY) private readonly directory: AdminUserDirectory,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: SetRolePermissionsCommand): Promise<RoleResult> {
    const role = await this.roles.findById(command.roleId);
    if (role === null) {
      throw new NotFoundDomainException('Role not found');
    }
    role.setPermissions(command.permissions, this.clock.now());
    await this.roles.save(role);
    const counts = await this.directory.countsByRole();
    return toRoleResult(role, counts.get(role.id) ?? 0);
  }
}

export interface DeleteRoleCommand {
  roleId: string;
}

/** Use case: delete a custom role that no user holds. */
@Injectable()
export class DeleteRoleUseCase {
  constructor(
    @Inject(ACCESS_ROLE_REPOSITORY) private readonly roles: AccessRoleRepository,
    @Inject(ADMIN_USER_DIRECTORY) private readonly directory: AdminUserDirectory,
  ) {}

  async execute(command: DeleteRoleCommand): Promise<void> {
    const role = await this.roles.findById(command.roleId);
    if (role === null) {
      throw new NotFoundDomainException('Role not found');
    }
    role.ensureDeletable();
    const counts = await this.directory.countsByRole();
    if ((counts.get(role.id) ?? 0) > 0) {
      throw new ValidationException('Reassign the users on this role before deleting it');
    }
    await this.roles.delete(role.id);
  }
}
