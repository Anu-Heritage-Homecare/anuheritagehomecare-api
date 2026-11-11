/**
 * Management view over the AdminUser table for the Users tab. Authentication and
 * credential writes stay in the admin-identity context; this port owns only the
 * management concerns (role and branch assignment, status, listing and removal),
 * so the two contexts write disjoint columns of the same table.
 */

export type AdminUserStatus = 'ACTIVE' | 'SUSPENDED';

/** The coarse AdminRole enum value carried by the auth token. */
export type AdminAuthRole = 'SUPER_ADMIN' | 'OPERATIONS_MANAGER' | 'COORDINATOR';

export interface AdminUserListFilters {
  search: string | null;
  roleId: string | null;
  branchId: string | null;
  status: AdminUserStatus | null;
  page: number;
  pageSize: number;
}

export interface AdminUserRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  roleId: string | null;
  roleName: string | null;
  branchId: string | null;
  branchName: string | null;
  status: AdminUserStatus;
  lastActiveAt: Date | null;
  photoKey: string | null;
}

export interface AdminUserAssignment {
  roleId?: string;
  /** null clears the branch assignment. */
  branchId?: string | null;
  status?: AdminUserStatus;
  /** Keeps the coarse auth role in step with the assigned configurable role. */
  authRole?: AdminAuthRole;
}

export interface ProvisionFromInvitation {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string | null;
  department: string | null;
  passwordHash: string;
  roleId: string;
  branchId: string | null;
  authRole: AdminAuthRole;
  /** True when provisioned with a temporary password that must be changed on first login. */
  mustChangePassword: boolean;
}

export interface AdminUserDirectory {
  list(filters: AdminUserListFilters): Promise<{ rows: AdminUserRow[]; total: number }>;
  findById(id: string): Promise<AdminUserRow | null>;
  updateAssignment(id: string, assignment: AdminUserAssignment): Promise<void>;
  delete(id: string): Promise<void>;
  /** How many admins hold each role id, for the role list and delete guard. */
  countsByRole(): Promise<Map<string, number>>;
  existsByEmail(email: string): Promise<boolean>;
  /** Whether an organization branch exists, to validate a branch assignment. */
  branchExists(branchId: string): Promise<boolean>;
  provisionFromInvitation(params: ProvisionFromInvitation): Promise<void>;
}

export const ADMIN_USER_DIRECTORY = Symbol('ADMIN_USER_DIRECTORY');
