import { User } from './user.entity';

/**
 * Persistence port for the User aggregate. Declared in the domain as an
 * interface; infrastructure supplies the Prisma adapter and the application
 * layer depends only on this abstraction (dependency inversion).
 */
export interface UserRepository {
  save(user: User): Promise<void>;
  findById(id: string): Promise<User | null>;
  findByIds(ids: string[]): Promise<User[]>;
  findByEmail(email: string): Promise<User | null>;
  existsByEmail(email: string): Promise<boolean>;
  existsByPhone(phone: string): Promise<boolean>;
}

/** Injection token, since TypeScript interfaces do not exist at runtime. */
export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
