import { PERMISSION_CATALOG } from '../../domain/permission-catalog';
import { AccessRole } from '../../domain/access-role.entity';

export interface PermissionMatrixRoleResult {
  id: string;
  name: string;
  isSystem: boolean;
  /** The permission keys this role grants. */
  granted: string[];
}

export interface PermissionCategoryResult {
  key: string;
  label: string;
  permissions: { key: string; label: string; description: string }[];
}

/** The Permissions tab: the fixed catalog plus which keys each role grants. */
export interface PermissionsMatrixResult {
  categories: PermissionCategoryResult[];
  roles: PermissionMatrixRoleResult[];
}

export function toPermissionsMatrixResult(roles: AccessRole[]): PermissionsMatrixResult {
  return {
    categories: PERMISSION_CATALOG.map((category) => ({
      key: category.key,
      label: category.label,
      permissions: category.permissions.map((permission) => ({
        key: permission.key,
        label: permission.label,
        description: permission.description,
      })),
    })),
    roles: roles.map((role) => ({
      id: role.id,
      name: role.name,
      isSystem: role.isSystem,
      granted: [...role.permissions],
    })),
  };
}
