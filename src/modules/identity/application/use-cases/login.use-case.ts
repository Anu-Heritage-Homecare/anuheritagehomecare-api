import { Inject, Injectable } from '@nestjs/common';
import {
  EmailNotVerifiedException,
  ForbiddenDomainException,
  UnauthorizedDomainException,
} from '@shared/domain/domain-exception';
import { UserStatus } from '../../domain/user-status.enum';
import { USER_REPOSITORY, UserRepository } from '../../domain/user.repository';
import { EmailAddress } from '../../domain/value-objects/email-address.vo';
import { LoginCommand } from '../commands/login.command';
import { LoginResult } from '../dto/login.result';
import { PASSWORD_HASHER, PasswordHasher } from '../ports/password-hasher.port';
import { TOKEN_SERVICE, TokenService } from '../ports/token-service.port';
import { TokenIssuerService } from '../services/token-issuer.service';

/**
 * Use case: authenticate a caregiver or family member with email and password.
 *
 * Wrong email and wrong password are reported identically so the endpoint never
 * reveals whether an account exists. An unverified email is only surfaced after
 * the password is proven correct, and carries a distinct error code so the
 * client can send the user to the verification screen. When two factor is enabled
 * the password alone does not issue tokens: a short lived challenge token is
 * returned and the second factor step must complete the login.
 */
@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    @Inject(TOKEN_SERVICE) private readonly tokens: TokenService,
    private readonly tokenIssuer: TokenIssuerService,
  ) {}

  async execute(command: LoginCommand): Promise<LoginResult> {
    const email = EmailAddress.create(command.email);
    const user = await this.users.findByEmail(email.value);

    if (user === null) {
      throw new UnauthorizedDomainException();
    }

    const passwordMatches = await this.hasher.compare(command.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedDomainException();
    }

    if (!user.emailVerified) {
      throw new EmailNotVerifiedException();
    }
    if (user.status === UserStatus.Suspended) {
      throw new ForbiddenDomainException('This account is suspended');
    }

    if (user.twoFactorEnabled) {
      const challengeToken = await this.tokens.signMfaToken({ sub: user.id });
      return { status: 'TWO_FACTOR_REQUIRED', challengeToken };
    }

    const tokens = await this.tokenIssuer.issueFor(user);
    return { status: 'AUTHENTICATED', tokens };
  }
}
