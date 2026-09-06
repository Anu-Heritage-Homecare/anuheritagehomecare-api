/**
 * Port over a one way password hashing algorithm for admin credentials. The
 * concrete adapter (bcrypt) lives in infrastructure, so use cases never depend on
 * a specific algorithm. A distinct token from the mobile identity hasher keeps
 * the two composition roots independent.
 */
export interface PasswordHasher {
  hash(plain: string): Promise<string>;
  compare(plain: string, hash: string): Promise<boolean>;
}

export const ADMIN_PASSWORD_HASHER = Symbol('ADMIN_PASSWORD_HASHER');
