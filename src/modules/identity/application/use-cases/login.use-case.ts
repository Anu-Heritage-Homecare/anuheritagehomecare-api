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
import { AuthTokensResult } from '../dto/auth-tokens.result';
import { PASSWORD_HASHER, PasswordHasher } from '../ports/password-hasher.port';
import { TokenIssuerService } from '../services/token-issuer.service';

/**
 * Use case: authenticate a caregiver or family member with email and password.
 *
 * Wrong email and wrong password are reported identically so the endpoint never
 * reveals whether an account exists. An unverified email is only surfaced after
 * the password is proven correct, and carries a distinct error code so the
 * client can send the user to the verification screen.
 */
@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    private readonly tokenIssuer: TokenIssuerService,
  ) {}

  async execute(command: LoginCommand): Promise<AuthTokensResult> {
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

    return this.tokenIssuer.issueFor(user);
  }
}
