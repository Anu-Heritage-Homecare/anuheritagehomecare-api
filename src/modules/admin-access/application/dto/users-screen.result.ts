import { AdminUserRow, AdminUserStatus } from '../ports/admin-user-directory.port';

export interface AdminUserResult {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  roleId: string | null;
  roleName: string | null;
  branchId: string | null;
  branchName: string | null;
  status: AdminUserStatus;
  lastActiveAt: Date | null;
  photoKey: string | null;
}

export interface UsersScreenResult {
  users: AdminUserResult[];
  total: number;
  page: number;
  pageSize: number;
}

export function toAdminUserResult(row: AdminUserRow): AdminUserResult {
  return {
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    fullName: `${row.firstName} ${row.lastName}`.trim(),
    email: row.email,
    roleId: row.roleId,
    roleName: row.roleName,
    branchId: row.branchId,
    branchName: row.branchName,
    status: row.status,
    lastActiveAt: row.lastActiveAt,
    photoKey: row.photoKey,
  };
}
