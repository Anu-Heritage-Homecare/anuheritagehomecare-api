import { AdminRole } from '../domain/admin-role.enum';
import { AdminUser } from '../domain/admin-user.entity';
import { EmailAddress } from '../domain/value-objects/email-address.vo';
import { PersonName } from '../domain/value-objects/person-name.vo';
import { FIXED_NOW } from './doubles';

/**
 * Builds an AdminUser for specs. The password hash is the FakePasswordHasher form
 * of `plainPassword` so the login and change password specs can prove a match.
 */
export function buildAdmin(
  overrides: {
    id?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    role?: AdminRole;
    plainPassword?: string;
    mustChangePassword?: boolean;
  } = {},
): AdminUser {
  const plain = overrides.plainPassword ?? 'S3curePassw0rd';
  return AdminUser.provision({
    id: overrides.id ?? 'admin-1',
    name: PersonName.create(overrides.firstName ?? 'Sarah', overrides.lastName ?? 'Jenkins'),
    email: EmailAddress.create(overrides.email ?? 'ops@anuheritagehomecare.com'),
    passwordHash: `hashed:${plain}`,
    role: overrides.role ?? AdminRole.OperationsManager,
    mustChangePassword: overrides.mustChangePassword ?? false,
    now: FIXED_NOW,
  });
}
