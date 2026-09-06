import { AdminUser } from '../../domain/admin-user.entity';
import { AdminRole } from '../../domain/admin-role.enum';

/** The admin's own account information, returned by login, refresh and the profile read. */
export interface AdminProfileResult {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  role: AdminRole;
  photoKey: string | null;
  mustChangePassword: boolean;
  lastLoginAt: Date | null;
}

export function toAdminProfile(admin: AdminUser): AdminProfileResult {
  return {
    id: admin.id,
    firstName: admin.name.firstName,
    lastName: admin.name.lastName,
    fullName: admin.name.fullName,
    email: admin.email.value,
    role: admin.role,
    photoKey: admin.photoKey,
    mustChangePassword: admin.mustChangePassword,
    lastLoginAt: admin.lastLoginAt,
  };
}
