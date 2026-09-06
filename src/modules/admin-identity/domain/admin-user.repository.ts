import { AdminUser } from './admin-user.entity';

/**
 * Persistence port for the AdminUser aggregate. Declared in the domain as an
 * interface; infrastructure supplies the Prisma adapter and the application layer
 * depends only on this abstraction (dependency inversion).
 */
export interface AdminUserRepository {
  save(admin: AdminUser): Promise<void>;
  findById(id: string): Promise<AdminUser | null>;
  findByEmail(email: string): Promise<AdminUser | null>;
}

/** Injection token, since TypeScript interfaces do not exist at runtime. */
export const ADMIN_USER_REPOSITORY = Symbol('ADMIN_USER_REPOSITORY');
