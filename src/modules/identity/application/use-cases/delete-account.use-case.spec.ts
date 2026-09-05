import { UnauthorizedDomainException } from '@shared/domain/domain-exception';
import { UserStatus } from '../../domain/user-status.enum';
import {
  FakePasswordHasher,
  InMemoryRefreshTokenRepository,
  InMemoryUserRepository,
  fixedClock,
} from '../../test-support/doubles';
import { buildUser } from '../../test-support/user-builder';
import { DeleteAccountUseCase } from './delete-account.use-case';

describe('DeleteAccountUseCase', () => {
  let users: InMemoryUserRepository;
  let refreshTokens: InMemoryRefreshTokenRepository;
  let useCase: DeleteAccountUseCase;

  beforeEach(async () => {
    users = new InMemoryUserRepository();
    refreshTokens = new InMemoryRefreshTokenRepository();
    useCase = new DeleteAccountUseCase(users, new FakePasswordHasher(), refreshTokens, fixedClock);
    // The builder's default password hash corresponds to 'S3curePass'.
    await users.save(buildUser({ id: 'user-1', verified: true }));
  });

  it('soft closes the account and blocks future login when the password matches', async () => {
    await useCase.execute({ userId: 'user-1', password: 'S3curePass' });

    const user = await users.findById('user-1');
    expect(user?.status).toBe(UserStatus.Closed);
    expect(user?.canLogIn).toBe(false);
  });

  it('rejects the deletion when the password is wrong', async () => {
    await expect(useCase.execute({ userId: 'user-1', password: 'wrong' })).rejects.toBeInstanceOf(
      UnauthorizedDomainException,
    );

    const user = await users.findById('user-1');
    expect(user?.status).toBe(UserStatus.Active);
  });
});
