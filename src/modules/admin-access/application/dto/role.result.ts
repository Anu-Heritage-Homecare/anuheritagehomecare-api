import { AccessRole } from '../../domain/access-role.entity';

export interface RoleResult {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions: string[];
  permissionCount: number;
  userCount: number;
}

export function toRoleResult(role: AccessRole, userCount: number): RoleResult {
  return {
    id: role.id,
    name: role.name,
    description: role.description,
    isSystem: role.isSystem,
    permissions: [...role.permissions],
    permissionCount: role.permissions.length,
    userCount,
  };
}
