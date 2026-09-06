import { UnauthorizedDomainException, ValidationException } from '@shared/domain/domain-exception';
import { buildAdmin } from '../../test-support/admin-builder';
import {
  FAKE_DEVICE,
  FIXED_NOW,
  FakeAdminTokenService,
  FakePasswordHasher,
  InMemoryAdminSessionRepository,
  InMemoryAdminUserRepository,
  fixedClock,
  sequentialIds,
} from '../../test-support/doubles';
import { AdminTokenIssuerService } from '../services/admin-token-issuer.service';
import { AdminLoginUseCase } from './admin-login.use-case';
import { AdminLogoutUseCase } from './admin-logout.use-case';
import { ChangeAdminPasswordUseCase } from './change-admin-password.use-case';
import { RefreshAdminTokenUseCase } from './refresh-admin-token.use-case';

function make(): {
  admins: InMemoryAdminUserRepository;
  sessions: InMemoryAdminSessionRepository;
  tokens: FakeAdminTokenService;
  login: AdminLoginUseCase;
  refresh: RefreshAdminTokenUseCase;
  logout: AdminLogoutUseCase;
  changePassword: ChangeAdminPasswordUseCase;
} {
  const admins = new InMemoryAdminUserRepository();
  const sessions = new InMemoryAdminSessionRepository();
  const tokens = new FakeAdminTokenService();
  const hasher = new FakePasswordHasher();
  const issuer = new AdminTokenIssuerService(tokens, sessions, fixedClock, sequentialIds('sess'));
  return {
    admins,
    sessions,
    tokens,
    login: new AdminLoginUseCase(admins, hasher, fixedClock, issuer),
    refresh: new RefreshAdminTokenUseCase(admins, sessions, tokens, fixedClock, issuer),
    logout: new AdminLogoutUseCase(sessions, tokens, fixedClock),
    changePassword: new ChangeAdminPasswordUseCase(admins, hasher, sessions, fixedClock, issuer),
  };
}

describe('admin auth flows', () => {
  it('rotates the refresh token in place: the old token stops working, the session is stable', async () => {
    const ctx = make();
    await ctx.admins.save(buildAdmin({ plainPassword: 'S3curePassw0rd' }));
    const first = await ctx.login.execute({
      email: 'ops@anuheritagehomecare.com',
      password: 'S3curePassw0rd',
      device: FAKE_DEVICE,
    });

    const second = await ctx.refresh.execute({ refreshToken: first.refreshToken });
    expect(second.refreshToken).not.toBe(first.refreshToken);
    // The old, rotated token no longer matches the session and is rejected.
    await expect(ctx.refresh.execute({ refreshToken: first.refreshToken })).rejects.toBeInstanceOf(
      UnauthorizedDomainException,
    );
    // Still exactly one session (rotated in place, not duplicated).
    expect(ctx.sessions.store.size).toBe(1);
  });

  it('logout revokes the session so its refresh token can no longer be used', async () => {
    const ctx = make();
    await ctx.admins.save(buildAdmin({ plainPassword: 'S3curePassw0rd' }));
    const tokens = await ctx.login.execute({
      email: 'ops@anuheritagehomecare.com',
      password: 'S3curePassw0rd',
      device: FAKE_DEVICE,
    });

    await ctx.logout.execute({ refreshToken: tokens.refreshToken });

    await expect(ctx.refresh.execute({ refreshToken: tokens.refreshToken })).rejects.toBeInstanceOf(
      UnauthorizedDomainException,
    );
  });

  it('change password clears must change, revokes other sessions and returns a fresh pair', async () => {
    const ctx = make();
    await ctx.admins.save(
      buildAdmin({ plainPassword: 'S3curePassw0rd', mustChangePassword: true }),
    );
    const firstLogin = await ctx.login.execute({
      email: 'ops@anuheritagehomecare.com',
      password: 'S3curePassw0rd',
      device: FAKE_DEVICE,
    });

    const result = await ctx.changePassword.execute({
      adminUserId: 'admin-1',
      currentPassword: 'S3curePassw0rd',
      newPassword: 'BrandNewPassw0rd',
      device: FAKE_DEVICE,
    });

    expect(result.admin.mustChangePassword).toBe(false);
    const stored = await ctx.admins.findById('admin-1');
    expect(stored?.passwordHash).toBe('hashed:BrandNewPassw0rd');
    // The session that existed before the change is revoked.
    await expect(
      ctx.refresh.execute({ refreshToken: firstLogin.refreshToken }),
    ).rejects.toBeInstanceOf(UnauthorizedDomainException);
    // The fresh pair issued alongside the change still works.
    const rotated = await ctx.refresh.execute({ refreshToken: result.refreshToken });
    expect(rotated.accessToken).toContain('access:admin-1');
  });

  it('rejects a change when the current password is wrong', async () => {
    const ctx = make();
    await ctx.admins.save(buildAdmin({ plainPassword: 'S3curePassw0rd' }));
    await expect(
      ctx.changePassword.execute({
        adminUserId: 'admin-1',
        currentPassword: 'WrongPassw0rd',
        newPassword: 'BrandNewPassw0rd',
        device: FAKE_DEVICE,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedDomainException);
  });

  it('rejects a change when the new password equals the current one', async () => {
    const ctx = make();
    await ctx.admins.save(buildAdmin({ plainPassword: 'S3curePassw0rd' }));
    await expect(
      ctx.changePassword.execute({
        adminUserId: 'admin-1',
        currentPassword: 'S3curePassw0rd',
        newPassword: 'S3curePassw0rd',
        device: FAKE_DEVICE,
      }),
    ).rejects.toBeInstanceOf(ValidationException);
  });

  it('logout on an unknown token is a silent no-op', async () => {
    const ctx = make();
    await expect(ctx.logout.execute({ refreshToken: 'refresh:nobody:1' })).resolves.toBeUndefined();
    expect(FIXED_NOW).toBeInstanceOf(Date);
  });
});
