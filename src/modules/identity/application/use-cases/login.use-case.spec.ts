import {
  EmailNotVerifiedException,
  UnauthorizedDomainException,
} from '@shared/domain/domain-exception';
import {
  FakePasswordHasher,
  FakeTokenService,
  InMemoryRefreshTokenRepository,
  InMemoryUserRepository,
  fixedClock,
  sequentialIds,
} from '../../test-support/doubles';
import { buildUser } from '../../test-support/user-builder';
import { TokenIssuerService } from '../services/token-issuer.service';
import { LoginUseCase } from './login.use-case';

describe('LoginUseCase', () => {
  let users: InMemoryUserRepository;
  let refreshTokens: InMemoryRefreshTokenRepository;
  let useCase: LoginUseCase;

  beforeEach(() => {
    users = new InMemoryUserRepository();
    refreshTokens = new InMemoryRefreshTokenRepository();
    const tokenIssuer = new TokenIssuerService(
      new FakeTokenService(),
      refreshTokens,
      fixedClock,
      sequentialIds('rt'),
    );
    useCase = new LoginUseCase(users, new FakePasswordHasher(), tokenIssuer);
  });

  it('issues tokens for a verified user with the correct password', async () => {
    await users.save(buildUser({ verified: true }));

    const result = await useCase.execute({
      email: 'ada.obi@example.com',
      password: 'S3curePass',
    });

    expect(result.tokenType).toBe('Bearer');
    expect(result.accessToken).toBe('access:user-1');
    expect(result.refreshToken).toContain('refresh:user-1');
    expect(result.user.email).toBe('ada.obi@example.com');
    expect(refreshTokens.store.size).toBe(1);
  });

  it('blocks login until the email is verified', async () => {
    await users.save(buildUser({ verified: false }));

    await expect(
      useCase.execute({ email: 'ada.obi@example.com', password: 'S3curePass' }),
    ).rejects.toBeInstanceOf(EmailNotVerifiedException);
  });

  it('rejects a wrong password without revealing the account', async () => {
    await users.save(buildUser({ verified: true }));

    await expect(
      useCase.execute({ email: 'ada.obi@example.com', password: 'WrongPass1' }),
    ).rejects.toBeInstanceOf(UnauthorizedDomainException);
  });

  it('rejects an unknown email identically to a wrong password', async () => {
    await expect(
      useCase.execute({ email: 'nobody@example.com', password: 'S3curePass' }),
    ).rejects.toBeInstanceOf(UnauthorizedDomainException);
  });
});
