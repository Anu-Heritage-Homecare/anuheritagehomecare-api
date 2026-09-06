import { UserType } from './user-type.enum';
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
  /** How many accounts of a given type exist. Backs the admin caregiver roster count. */
  countByType(userType: UserType): Promise<number>;
}

/** Injection token, since TypeScript interfaces do not exist at runtime. */
export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
