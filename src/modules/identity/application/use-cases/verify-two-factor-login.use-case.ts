import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import {
  ForbiddenDomainException,
  UnauthorizedDomainException,
} from '@shared/domain/domain-exception';
import { UserStatus } from '../../domain/user-status.enum';
import {
  TWO_FACTOR_RECOVERY_CODE_REPOSITORY,
  TwoFactorRecoveryCodeRepository,
} from '../../domain/two-factor-recovery-code.repository';
import { USER_REPOSITORY, UserRepository } from '../../domain/user.repository';
import { AuthTokensResult } from '../dto/auth-tokens.result';
import { DeviceContext } from '../dto/device-context';
import { SECRET_CIPHER, SecretCipher } from '../ports/secret-cipher.port';
import { TOKEN_SERVICE, TokenService } from '../ports/token-service.port';
import {
  TWO_FACTOR_AUTHENTICATOR,
  TwoFactorAuthenticator,
} from '../ports/two-factor-authenticator.port';
import { LoginOutcome } from '../../domain/login-event.entity';
import { LoginEventRecorder } from '../services/login-event-recorder.service';
import { TokenIssuerService } from '../services/token-issuer.service';

export interface VerifyTwoFactorLoginCommand {
  challengeToken: string;
  code: string;
  device: DeviceContext;
}

/**
 * Use case: complete a login that was challenged for two factor. The challenge
 * token identifies the user; the submitted code is accepted either as a valid
 * TOTP code or as a single use recovery code, which is then consumed. On success
 * the full token pair is issued.
 */
@Injectable()
export class VerifyTwoFactorLoginUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(TOKEN_SERVICE) private readonly tokens: TokenService,
    @Inject(TWO_FACTOR_AUTHENTICATOR) private readonly authenticator: TwoFactorAuthenticator,
    @Inject(SECRET_CIPHER) private readonly cipher: SecretCipher,
    @Inject(TWO_FACTOR_RECOVERY_CODE_REPOSITORY)
    private readonly recoveryCodes: TwoFactorRecoveryCodeRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly tokenIssuer: TokenIssuerService,
    private readonly loginEvents: LoginEventRecorder,
  ) {}

  async execute(command: VerifyTwoFactorLoginCommand): Promise<AuthTokensResult> {
    const claims = await this.tokens.verifyMfaToken(command.challengeToken);

    const user = await this.users.findById(claims.sub);
    if (user === null || !user.twoFactorEnabled || user.twoFactorSecret === null) {
      throw new UnauthorizedDomainException();
    }
    if (user.status === UserStatus.Suspended) {
      throw new ForbiddenDomainException('This account is suspended');
    }

    const now = this.clock.now();
    const secret = this.cipher.decrypt(user.twoFactorSecret);
    const totpValid = this.authenticator.verify({ secret, code: command.code, now });

    if (!totpValid) {
      const consumed = await this.consumeRecoveryCode(user.id, command.code, now);
      if (!consumed) {
        await this.loginEvents.record(user.id, LoginOutcome.Failure, command.device);
        throw new UnauthorizedDomainException('Invalid authentication code');
      }
    }

    const tokens = await this.tokenIssuer.issueForNewSession(user, command.device);
    await this.loginEvents.record(user.id, LoginOutcome.Success, command.device);
    return tokens;
  }

  private async consumeRecoveryCode(userId: string, code: string, now: Date): Promise<boolean> {
    const normalised = code.replace(/\s+/g, '').toUpperCase();
    const codeHash = this.tokens.hashToken(normalised);
    const recoveryCode = await this.recoveryCodes.findActive(userId, codeHash);
    if (recoveryCode === null) {
      return false;
    }
    recoveryCode.consume(now);
    await this.recoveryCodes.save(recoveryCode);
    return true;
  }
}
