import { AccessRole } from './access-role.entity';

/** Persistence port for configurable access roles. */
export interface AccessRoleRepository {
  list(): Promise<AccessRole[]>;
  findById(id: string): Promise<AccessRole | null>;
  findByName(name: string): Promise<AccessRole | null>;
  save(role: AccessRole): Promise<void>;
  delete(id: string): Promise<void>;
}

export const ACCESS_ROLE_REPOSITORY = Symbol('ACCESS_ROLE_REPOSITORY');
