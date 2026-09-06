import {
  ForbiddenDomainException,
  UnauthorizedDomainException,
} from '@shared/domain/domain-exception';
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

function make(): {
  admins: InMemoryAdminUserRepository;
  sessions: InMemoryAdminSessionRepository;
  useCase: AdminLoginUseCase;
} {
  const admins = new InMemoryAdminUserRepository();
  const sessions = new InMemoryAdminSessionRepository();
  const tokens = new FakeAdminTokenService();
  const issuer = new AdminTokenIssuerService(tokens, sessions, fixedClock, sequentialIds('sess'));
  const useCase = new AdminLoginUseCase(admins, new FakePasswordHasher(), fixedClock, issuer);
  return { admins, sessions, useCase };
}

describe('AdminLoginUseCase', () => {
  it('issues a token pair, opens a session and stamps the last login on success', async () => {
    const { admins, sessions, useCase } = make();
    await admins.save(buildAdmin({ plainPassword: 'S3curePassw0rd' }));

    const result = await useCase.execute({
      email: 'ops@anuheritagehomecare.com',
      password: 'S3curePassw0rd',
      device: FAKE_DEVICE,
    });

    expect(result.accessToken).toBe('access:admin-1:sess-1');
    expect(result.refreshToken).toMatch(/^refresh:admin-1:/);
    expect(result.admin.email).toBe('ops@anuheritagehomecare.com');
    expect(sessions.store.size).toBe(1);
    const session = [...sessions.store.values()][0];
    expect(session.isActive(FIXED_NOW)).toBe(true);
    const stored = await admins.findById('admin-1');
    expect(stored?.lastLoginAt).toEqual(FIXED_NOW);
  });

  it('surfaces the must change password flag so the client can force a change', async () => {
    const { admins, useCase } = make();
    await admins.save(buildAdmin({ mustChangePassword: true, plainPassword: 'S3curePassw0rd' }));

    const result = await useCase.execute({
      email: 'ops@anuheritagehomecare.com',
      password: 'S3curePassw0rd',
      device: FAKE_DEVICE,
    });

    expect(result.admin.mustChangePassword).toBe(true);
  });

  it('rejects an unknown email the same way as a wrong password', async () => {
    const { useCase } = make();
    await expect(
      useCase.execute({ email: 'nobody@x.com', password: 'whatever1A', device: FAKE_DEVICE }),
    ).rejects.toBeInstanceOf(UnauthorizedDomainException);
  });

  it('rejects a wrong password and does not open a session', async () => {
    const { admins, sessions, useCase } = make();
    await admins.save(buildAdmin({ plainPassword: 'S3curePassw0rd' }));

    await expect(
      useCase.execute({
        email: 'ops@anuheritagehomecare.com',
        password: 'WrongPassw0rd',
        device: FAKE_DEVICE,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedDomainException);
    expect(sessions.store.size).toBe(0);
  });

  it('refuses a suspended account only after the password is proven', async () => {
    const { admins, useCase } = make();
    const admin = buildAdmin({ plainPassword: 'S3curePassw0rd' });
    admin.suspend(FIXED_NOW);
    await admins.save(admin);

    await expect(
      useCase.execute({
        email: 'ops@anuheritagehomecare.com',
        password: 'S3curePassw0rd',
        device: FAKE_DEVICE,
      }),
    ).rejects.toBeInstanceOf(ForbiddenDomainException);
  });
});
