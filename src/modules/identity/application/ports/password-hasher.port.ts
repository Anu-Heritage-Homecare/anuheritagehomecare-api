/**
 * Port over a one way password hashing algorithm. The concrete adapter (bcrypt)
 * lives in infrastructure, so use cases never depend on a specific algorithm and
 * it can be swapped without touching business logic. Also used to hash one time
 * passcodes, which are short lived secrets.
 */
export interface PasswordHasher {
  hash(plain: string): Promise<string>;
  compare(plain: string, hash: string): Promise<boolean>;
}

export const PASSWORD_HASHER = Symbol('PASSWORD_HASHER');
