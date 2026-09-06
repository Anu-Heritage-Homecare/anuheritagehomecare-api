import { UnauthorizedDomainException, ValidationException } from '@shared/domain/domain-exception';
import { UserType } from '../../domain/user-type.enum';
import {
  FAKE_DEVICE,
  FIXED_NOW,
  FakePasswordHasher,
  FakeTokenService,
  InMemoryDeviceSessionRepository,
  InMemoryUserRepository,
  fixedClock,
  sequentialIds,
} from '../../test-support/doubles';
import { buildUser } from '../../test-support/user-builder';
import { TokenIssuerService } from '../services/token-issuer.service';
import { ChangePasswordUseCase } from './change-password.use-case';

describe('ChangePasswordUseCase', () => {
  let users: InMemoryUserRepository;
  let sessions: InMemoryDeviceSessionRepository;
  let tokenIssuer: TokenIssuerService;
  let useCase: ChangePasswordUseCase;

  beforeEach(() => {
    users = new InMemoryUserRepository();
    sessions = new InMemoryDeviceSessionRepository();
    tokenIssuer = new TokenIssuerService(
      new FakeTokenService(),
      sessions,
      fixedClock,
      sequentialIds('sid'),
    );
    useCase = new ChangePasswordUseCase(
      users,
      new FakePasswordHasher(),
      sessions,
      fixedClock,
      tokenIssuer,
    );
  });

  /** A verified caregiver still holding the temporary password admin issued. */
  async function seedProvisionedCaregiver(): Promise<void> {
    await users.save(
      buildUser({
        userType: UserType.Caregiver,
        verified: true,
        mustChangePassword: true,
        passwordHash: 'hashed:TempPass1',
      }),
    );
  }

  it('changes the password, clears the flag and issues a fresh token pair', async () => {
    await seedProvisionedCaregiver();

    const result = await useCase.execute({
      userId: 'user-1',
      currentPassword: 'TempPass1',
      newPassword: 'S3curePass',
      device: FAKE_DEVICE,
    });

    expect(result.tokenType).toBe('Bearer');
    expect(result.accessToken).toBe('access:user-1');
    expect(result.user.mustChangePassword).toBe(false);

    const stored = await users.findById('user-1');
    expect(stored?.mustChangePassword).toBe(false);
    expect(stored?.passwordHash).toBe('hashed:S3curePass');
  });

  it('revokes every existing session, leaving only the freshly issued token active', async () => {
    await seedProvisionedCaregiver();
    // An existing session from before the change.
    await tokenIssuer.issueForNewSession((await users.findById('user-1'))!, FAKE_DEVICE);

    await useCase.execute({
      userId: 'user-1',
      currentPassword: 'TempPass1',
      newPassword: 'S3curePass',
      device: FAKE_DEVICE,
    });

    const active = [...sessions.store.values()].filter((s) => s.isActive(FIXED_NOW));
    expect(active).toHaveLength(1);
  });

  it('rejects an incorrect current password and leaves the account untouched', async () => {
    await seedProvisionedCaregiver();

    await expect(
      useCase.execute({
        userId: 'user-1',
        currentPassword: 'WrongPass1',
        newPassword: 'S3curePass',
        device: FAKE_DEVICE,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedDomainException);

    const stored = await users.findById('user-1');
    expect(stored?.mustChangePassword).toBe(true);
    expect(stored?.passwordHash).toBe('hashed:TempPass1');
  });

  it('rejects a new password identical to the current one', async () => {
    await seedProvisionedCaregiver();

    await expect(
      useCase.execute({
        userId: 'user-1',
        currentPassword: 'TempPass1',
        newPassword: 'TempPass1',
        device: FAKE_DEVICE,
      }),
    ).rejects.toBeInstanceOf(ValidationException);
  });

  it('rejects a new password that fails the policy', async () => {
    await seedProvisionedCaregiver();

    await expect(
      useCase.execute({
        userId: 'user-1',
        currentPassword: 'TempPass1',
        newPassword: 'weak',
        device: FAKE_DEVICE,
      }),
    ).rejects.toBeInstanceOf(ValidationException);
  });

  it('rejects an unknown user', async () => {
    await expect(
      useCase.execute({
        userId: 'ghost',
        currentPassword: 'TempPass1',
        newPassword: 'S3curePass',
        device: FAKE_DEVICE,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedDomainException);
  });
});
