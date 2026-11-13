import { AggregateRoot } from '@shared/domain/aggregate-root.base';
import { ValidationException } from '@shared/domain/domain-exception';
import { ALL_PERMISSION_KEYS } from './permission-catalog';

const MAX_NAME = 80;
const MAX_DESCRIPTION = 300;

interface AccessRoleProps {
  name: string;
  description: string | null;
  isSystem: boolean;
  /** The coarse AdminRole enum value this role maps to, kept for the auth token. */
  systemKey: string | null;
  permissions: string[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * A configurable back office access role. System roles are seeded and cannot be
 * renamed or deleted, but their granted permissions may still be adjusted. Custom
 * roles are fully editable. Granted permissions are always a subset of the fixed
 * permission catalog.
 */
export class AccessRole extends AggregateRoot<string> {
  private props: AccessRoleProps;

  private constructor(id: string, props: AccessRoleProps) {
    super(id);
    this.props = props;
  }

  public static create(params: {
    id: string;
    name: string;
    description?: string | null;
    permissions?: string[];
    now: Date;
  }): AccessRole {
    return new AccessRole(params.id, {
      name: AccessRole.cleanName(params.name),
      description: AccessRole.cleanDescription(params.description),
      isSystem: false,
      systemKey: null,
      permissions: AccessRole.cleanPermissions(params.permissions ?? []),
      createdAt: params.now,
      updatedAt: params.now,
    });
  }

  public static rehydrate(id: string, props: AccessRoleProps): AccessRole {
    return new AccessRole(id, props);
  }

  /** Rename or re-describe the role. A system role's name is fixed. */
  public editDetails(fields: { name?: string; description?: string | null }, now: Date): void {
    if (fields.name !== undefined) {
      const name = AccessRole.cleanName(fields.name);
      if (this.props.isSystem && name !== this.props.name) {
        throw new ValidationException('A system role cannot be renamed');
      }
      this.props.name = name;
    }
    if (fields.description !== undefined) {
      this.props.description = AccessRole.cleanDescription(fields.description);
    }
    this.props.updatedAt = now;
  }

  /** Replace the granted permission set (the Permissions tab toggles). */
  public setPermissions(keys: string[], now: Date): void {
    this.props.permissions = AccessRole.cleanPermissions(keys);
    this.props.updatedAt = now;
  }

  /** A system role may not be deleted. */
  public ensureDeletable(): void {
    if (this.props.isSystem) {
      throw new ValidationException('A system role cannot be deleted');
    }
  }

  private static cleanName(value: string): string {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      throw new ValidationException('Role name is required');
    }
    if (trimmed.length > MAX_NAME) {
      throw new ValidationException('Role name exceeds the maximum length');
    }
    return trimmed;
  }

  private static cleanDescription(value: string | null | undefined): string | null {
    if (value === null || value === undefined) {
      return null;
    }
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return null;
    }
    if (trimmed.length > MAX_DESCRIPTION) {
      throw new ValidationException('Role description exceeds the maximum length');
    }
    return trimmed;
  }

  private static cleanPermissions(keys: string[]): string[] {
    const unique = new Set<string>();
    for (const key of keys) {
      if (!ALL_PERMISSION_KEYS.has(key)) {
        throw new ValidationException(`Unknown permission: ${key}`);
      }
      unique.add(key);
    }
    return [...unique];
  }

  public get name(): string {
    return this.props.name;
  }

  public get description(): string | null {
    return this.props.description;
  }

  public get isSystem(): boolean {
    return this.props.isSystem;
  }

  public get systemKey(): string | null {
    return this.props.systemKey;
  }

  public get permissions(): ReadonlyArray<string> {
    return this.props.permissions;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }

  public get updatedAt(): Date {
    return this.props.updatedAt;
  }
}
