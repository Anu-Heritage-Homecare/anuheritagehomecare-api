import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import {
  ForbiddenDomainException,
  UnauthorizedDomainException,
} from '@shared/domain/domain-exception';
import { ADMIN_USER_REPOSITORY, AdminUserRepository } from '../../domain/admin-user.repository';
import { AdminStatus } from '../../domain/admin-status.enum';
import { EmailAddress } from '../../domain/value-objects/email-address.vo';
import { AdminLoginCommand } from '../commands/admin-login.command';
import { AdminAuthTokensResult } from '../dto/admin-auth-tokens.result';
import { ADMIN_PASSWORD_HASHER, PasswordHasher } from '../ports/password-hasher.port';
import { AdminTokenIssuerService } from '../services/admin-token-issuer.service';

/**
 * Use case: authenticate an admin with email and password.
 *
 * Wrong email and wrong password are reported identically so the endpoint never
 * reveals whether an account exists. A suspended account is refused only after the
 * password is proven, so the same rule does not leak account existence. Admins
 * have no two factor or email verification step in this iteration; the profile
 * carries `mustChangePassword` so the client can force a change on first login.
 */
@Injectable()
export class AdminLoginUseCase {
  constructor(
    @Inject(ADMIN_USER_REPOSITORY) private readonly admins: AdminUserRepository,
    @Inject(ADMIN_PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly tokenIssuer: AdminTokenIssuerService,
  ) {}

  async execute(command: AdminLoginCommand): Promise<AdminAuthTokensResult> {
    const email = EmailAddress.create(command.email);
    const admin = await this.admins.findByEmail(email.value);

    if (admin === null) {
      throw new UnauthorizedDomainException();
    }

    const passwordMatches = await this.hasher.compare(command.password, admin.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedDomainException();
    }

    if (admin.status === AdminStatus.Suspended) {
      throw new ForbiddenDomainException('This account is suspended');
    }

    admin.recordLogin(this.clock.now());
    await this.admins.save(admin);

    return this.tokenIssuer.issueForNewSession(admin, command.device);
  }
}
