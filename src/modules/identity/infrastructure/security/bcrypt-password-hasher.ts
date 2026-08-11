import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthConfig } from '@config/configuration';
import * as bcrypt from 'bcrypt';
import { PasswordHasher } from '../../application/ports/password-hasher.port';

/**
 * bcrypt implementation of the PasswordHasher port. The cost factor is taken
 * from validated configuration so it can be tuned without code changes.
 */
@Injectable()
export class BcryptPasswordHasher implements PasswordHasher {
  private readonly saltRounds: number;

  constructor(config: ConfigService) {
    this.saltRounds = config.getOrThrow<AuthConfig>('auth').bcryptSaltRounds;
  }

  hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, this.saltRounds);
  }

  compare(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }
}
