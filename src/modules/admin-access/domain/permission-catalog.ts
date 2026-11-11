/**
 * The fixed catalog of back office permissions (capabilities the software
 * defines). Roles grant a subset of these keys; the Permissions tab renders the
 * catalog as its rows and shows, per role, which keys are granted. Because the
 * catalog is the source of truth for valid keys, a role can never be given a
 * permission the system does not know about.
 */
export interface PermissionDefinition {
  key: string;
  label: string;
  description: string;
}

export interface PermissionCategory {
  key: string;
  label: string;
  permissions: PermissionDefinition[];
}

/** The four uniform actions every module exposes (the matrix columns). */
export const PERMISSION_ACTIONS: readonly { action: string; label: string }[] = [
  { action: 'view', label: 'View' },
  { action: 'create', label: 'Create' },
  { action: 'edit', label: 'Edit' },
  { action: 'delete', label: 'Delete' },
];

/** The modules that form the matrix rows. */
export const PERMISSION_MODULES: readonly { key: string; label: string }[] = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'care_recipients', label: 'Care Recipients' },
  { key: 'scheduling', label: 'Scheduling' },
  { key: 'billing', label: 'Billing' },
  { key: 'messages', label: 'Messages' },
  { key: 'reports', label: 'Reports' },
  { key: 'settings', label: 'Settings' },
];

/** Build a permission key from a module and an action (e.g. `care_recipients.view`). */
export function permissionKey(moduleKey: string, action: string): string {
  return `${moduleKey}.${action}`;
}

/**
 * The catalog as a uniform module by action grid (View, Create, Edit, Delete per
 * module), rendered directly as the Module Permissions matrix.
 */
export const PERMISSION_CATALOG: readonly PermissionCategory[] = PERMISSION_MODULES.map(
  (module) => ({
    key: module.key,
    label: module.label,
    permissions: PERMISSION_ACTIONS.map((action) => ({
      key: permissionKey(module.key, action.action),
      label: action.label,
      description: `${action.label} ${module.label}`,
    })),
  }),
);

/** Every valid permission key, flattened from the catalog. */
export const ALL_PERMISSION_KEYS: ReadonlySet<string> = new Set(
  PERMISSION_CATALOG.flatMap((category) =>
    category.permissions.map((permission) => permission.key),
  ),
);

/** All permission keys as an array (e.g. to grant everything to an Administrator). */
export function allPermissionKeys(): string[] {
  return [...ALL_PERMISSION_KEYS];
}
