import { Clock } from '@shared/application/ports/clock.port';
import { IdGenerator } from '@shared/application/ports/id-generator.port';
import { PasswordHasher } from '@modules/admin-identity/application/ports/password-hasher.port';
import { NotFoundDomainException, ValidationException } from '@shared/domain/domain-exception';
import { AccessRole } from '../../domain/access-role.entity';
import { AccessRoleRepository } from '../../domain/access-role.repository';
import { Invitation } from '../../domain/invitation.entity';
import { InvitationStatus } from '../../domain/invitation-status.enum';
import { InvitationRepository } from '../../domain/invitation.repository';
import {
  AdminUserAssignment,
  AdminUserDirectory,
  AdminUserListFilters,
  AdminUserRow,
  ProvisionFromInvitation,
} from '../ports/admin-user-directory.port';
import { InvitationTokenService } from '../ports/invitation-token.service';
import { AcceptInvitationUseCase } from './accept-invitation.use-case';
import {
  CreateInvitationUseCase,
  ProvisionAdminUserUseCase,
  RevokeInvitationUseCase,
} from './invitations.use-cases';
import {
  CreateRoleUseCase,
  DeleteRoleUseCase,
  ListRolesUseCase,
  SetRolePermissionsUseCase,
  UpdateRoleUseCase,
} from './roles.use-cases';
import {
  DeleteAdminUserUseCase,
  ListAdminUsersUseCase,
  UpdateAdminUserUseCase,
} from './users.use-cases';

const NOW = new Date('2026-11-09T09:00:00.000Z');
const clock: Clock = { now: () => NOW };

function sequentialIds(prefix = 'id'): IdGenerator {
  let n = 0;
  return {
    generate: () => {
      n += 1;
      return `${prefix}-${n}`;
    },
  };
}

const hasher: PasswordHasher = {
  hash: (plain) => Promise.resolve(`hashed:${plain}`),
  compare: (plain, hash) => Promise.resolve(hash === `hashed:${plain}`),
};

class FakeTokenService implements InvitationTokenService {
  private n = 0;
  generate(): { token: string; tokenHash: string } {
    this.n += 1;
    const token = `token-${this.n}`;
    return { token, tokenHash: this.hash(token) };
  }
  hash(token: string): string {
    return `hash:${token}`;
  }
}

class InMemoryRoles implements AccessRoleRepository {
  store = new Map<string, AccessRole>();
  list(): Promise<AccessRole[]> {
    return Promise.resolve([...this.store.values()]);
  }
  findById(id: string): Promise<AccessRole | null> {
    return Promise.resolve(this.store.get(id) ?? null);
  }
  findByName(name: string): Promise<AccessRole | null> {
    return Promise.resolve([...this.store.values()].find((r) => r.name === name) ?? null);
  }
  save(role: AccessRole): Promise<void> {
    this.store.set(role.id, role);
    return Promise.resolve();
  }
  delete(id: string): Promise<void> {
    this.store.delete(id);
    return Promise.resolve();
  }
  seedSystem(id: string, name: string, systemKey: string | null): AccessRole {
    const role = AccessRole.rehydrate(id, {
      name,
      description: null,
      isSystem: true,
      systemKey,
      permissions: [],
      createdAt: NOW,
      updatedAt: NOW,
    });
    this.store.set(id, role);
    return role;
  }
}

class InMemoryInvitations implements InvitationRepository {
  store = new Map<string, Invitation>();
  list(status: InvitationStatus | null): Promise<Invitation[]> {
    const all = [...this.store.values()];
    return Promise.resolve(status === null ? all : all.filter((i) => i.status === status));
  }
  findById(id: string): Promise<Invitation | null> {
    return Promise.resolve(this.store.get(id) ?? null);
  }
  findPendingByTokenHash(tokenHash: string): Promise<Invitation | null> {
    return Promise.resolve(
      [...this.store.values()].find(
        (i) => i.tokenHash === tokenHash && i.status === InvitationStatus.Pending,
      ) ?? null,
    );
  }
  existsPendingForEmail(email: string): Promise<boolean> {
    return Promise.resolve(
      [...this.store.values()].some(
        (i) => i.email === email && i.status === InvitationStatus.Pending,
      ),
    );
  }
  save(invitation: Invitation): Promise<void> {
    this.store.set(invitation.id, invitation);
    return Promise.resolve();
  }
}

class InMemoryDirectory implements AdminUserDirectory {
  rows = new Map<string, AdminUserRow>();
  branches = new Set<string>();
  assignments: { id: string; assignment: AdminUserAssignment }[] = [];
  provisioned: ProvisionFromInvitation[] = [];

  list(filters: AdminUserListFilters): Promise<{ rows: AdminUserRow[]; total: number }> {
    let rows = [...this.rows.values()];
    if (filters.status) {
      rows = rows.filter((r) => r.status === filters.status);
    }
    if (filters.roleId) {
      rows = rows.filter((r) => r.roleId === filters.roleId);
    }
    const total = rows.length;
    const start = (filters.page - 1) * filters.pageSize;
    return Promise.resolve({ rows: rows.slice(start, start + filters.pageSize), total });
  }
  findById(id: string): Promise<AdminUserRow | null> {
    return Promise.resolve(this.rows.get(id) ?? null);
  }
  updateAssignment(id: string, assignment: AdminUserAssignment): Promise<void> {
    this.assignments.push({ id, assignment });
    const row = this.rows.get(id);
    if (row) {
      if (assignment.roleId !== undefined) row.roleId = assignment.roleId;
      if (assignment.status !== undefined) row.status = assignment.status;
    }
    return Promise.resolve();
  }
  delete(id: string): Promise<void> {
    this.rows.delete(id);
    return Promise.resolve();
  }
  countsByRole(): Promise<Map<string, number>> {
    const counts = new Map<string, number>();
    for (const row of this.rows.values()) {
      if (row.roleId) counts.set(row.roleId, (counts.get(row.roleId) ?? 0) + 1);
    }
    return Promise.resolve(counts);
  }
  existsByEmail(email: string): Promise<boolean> {
    return Promise.resolve([...this.rows.values()].some((r) => r.email === email));
  }
  branchExists(branchId: string): Promise<boolean> {
    return Promise.resolve(this.branches.has(branchId));
  }
  provisionFromInvitation(params: ProvisionFromInvitation): Promise<void> {
    this.provisioned.push(params);
    this.rows.set(params.id, {
      id: params.id,
      firstName: params.firstName,
      lastName: params.lastName,
      email: params.email,
      roleId: params.roleId,
      roleName: null,
      branchId: params.branchId,
      branchName: null,
      status: 'ACTIVE',
      lastActiveAt: null,
      photoKey: null,
    });
    return Promise.resolve();
  }
  seedUser(row: Partial<AdminUserRow> & { id: string; email: string }): void {
    this.rows.set(row.id, {
      firstName: 'A',
      lastName: 'B',
      roleId: null,
      roleName: null,
      branchId: null,
      branchName: null,
      status: 'ACTIVE',
      lastActiveAt: null,
      photoKey: null,
      ...row,
    });
  }
}

describe('Admin access flows', () => {
  let roles: InMemoryRoles;
  let invitations: InMemoryInvitations;
  let directory: InMemoryDirectory;
  let tokens: FakeTokenService;

  beforeEach(() => {
    roles = new InMemoryRoles();
    invitations = new InMemoryInvitations();
    directory = new InMemoryDirectory();
    tokens = new FakeTokenService();
  });

  describe('roles', () => {
    it('lists roles with their user counts', async () => {
      const admin = roles.seedSystem('r-admin', 'Administrator', 'SUPER_ADMIN');
      directory.seedUser({ id: 'u1', email: 'a@x.com', roleId: admin.id });
      directory.seedUser({ id: 'u2', email: 'b@x.com', roleId: admin.id });
      const result = await new ListRolesUseCase(roles, directory).execute();
      expect(result).toHaveLength(1);
      expect(result[0].userCount).toBe(2);
    });

    it('creates a custom role and rejects a duplicate name', async () => {
      const create = new CreateRoleUseCase(roles, clock, sequentialIds('role'));
      const role = await create.execute({ name: 'Scheduler', permissions: ['scheduling.view'] });
      expect(role.permissions).toEqual(['scheduling.view']);
      await expect(create.execute({ name: 'Scheduler' })).rejects.toBeInstanceOf(
        ValidationException,
      );
    });

    it('copies a base template role and unions explicit permissions', async () => {
      const create = new CreateRoleUseCase(roles, clock, sequentialIds('role'));
      const base = await create.execute({
        name: 'Coordinator',
        permissions: ['care_recipients.view', 'scheduling.view'],
      });
      const derived = await create.execute({
        name: 'Clinical Coordinator',
        baseRoleId: base.id,
        permissions: ['scheduling.edit'],
      });
      expect([...derived.permissions].sort()).toEqual([
        'care_recipients.view',
        'scheduling.edit',
        'scheduling.view',
      ]);

      await expect(
        create.execute({ name: 'Orphan', baseRoleId: 'missing' }),
      ).rejects.toBeInstanceOf(ValidationException);
    });

    it('rejects an unknown permission key', async () => {
      const create = new CreateRoleUseCase(roles, clock, sequentialIds('role'));
      await expect(
        create.execute({ name: 'Bad', permissions: ['not.a.permission'] }),
      ).rejects.toBeInstanceOf(ValidationException);
    });

    it('cannot rename a system role but can set its permissions', async () => {
      const admin = roles.seedSystem('r-admin', 'Administrator', 'SUPER_ADMIN');
      const update = new UpdateRoleUseCase(roles, directory, clock);
      await expect(update.execute({ roleId: admin.id, name: 'Boss' })).rejects.toBeInstanceOf(
        ValidationException,
      );
      const updated = await new SetRolePermissionsUseCase(roles, directory, clock).execute({
        roleId: admin.id,
        permissions: ['reports.view'],
      });
      expect(updated.permissions).toEqual(['reports.view']);
    });

    it('refuses to delete a system role or a role in use', async () => {
      const system = roles.seedSystem('r-admin', 'Administrator', 'SUPER_ADMIN');
      const del = new DeleteRoleUseCase(roles, directory);
      await expect(del.execute({ roleId: system.id })).rejects.toBeInstanceOf(ValidationException);

      const custom = await new CreateRoleUseCase(roles, clock, sequentialIds('role')).execute({
        name: 'Finance',
      });
      directory.seedUser({ id: 'u1', email: 'a@x.com', roleId: custom.id });
      await expect(del.execute({ roleId: custom.id })).rejects.toBeInstanceOf(ValidationException);
    });
  });

  describe('users', () => {
    it('paginates the list', async () => {
      for (let i = 0; i < 25; i += 1) {
        directory.seedUser({ id: `u${i}`, email: `u${i}@x.com` });
      }
      const result = await new ListAdminUsersUseCase(directory).execute({ page: 2, pageSize: 20 });
      expect(result.total).toBe(25);
      expect(result.users).toHaveLength(5);
      expect(result.page).toBe(2);
    });

    it('assigns a role and syncs the coarse auth role', async () => {
      const role = roles.seedSystem('r-ops', 'Operations Manager', 'OPERATIONS_MANAGER');
      directory.seedUser({ id: 'u1', email: 'a@x.com' });
      await new UpdateAdminUserUseCase(directory, roles).execute({ userId: 'u1', roleId: role.id });
      expect(directory.assignments[0].assignment.authRole).toBe('OPERATIONS_MANAGER');
    });

    it('defaults an unmapped custom role to least privilege', async () => {
      const role = await new CreateRoleUseCase(roles, clock, sequentialIds('role')).execute({
        name: 'Scheduler',
      });
      directory.seedUser({ id: 'u1', email: 'a@x.com' });
      await new UpdateAdminUserUseCase(directory, roles).execute({ userId: 'u1', roleId: role.id });
      expect(directory.assignments[0].assignment.authRole).toBe('COORDINATOR');
    });

    it('rejects an unknown branch assignment', async () => {
      directory.seedUser({ id: 'u1', email: 'a@x.com' });
      await expect(
        new UpdateAdminUserUseCase(directory, roles).execute({ userId: 'u1', branchId: 'missing' }),
      ).rejects.toBeInstanceOf(ValidationException);
    });

    it('raises deleting a missing user', async () => {
      await expect(
        new DeleteAdminUserUseCase(directory).execute({ userId: 'nope' }),
      ).rejects.toBeInstanceOf(NotFoundDomainException);
    });
  });

  describe('invitations', () => {
    function createUseCase(): CreateInvitationUseCase {
      return new CreateInvitationUseCase(
        invitations,
        roles,
        directory,
        tokens,
        clock,
        sequentialIds('inv'),
      );
    }

    it('invites a user and returns the one time token once', async () => {
      const role = roles.seedSystem('r-admin', 'Administrator', 'SUPER_ADMIN');
      const result = await createUseCase().execute({
        email: 'Taiwo@Careprofs.NG',
        firstName: 'Taiwo',
        lastName: 'Ogunleye',
        roleId: role.id,
        invitedByAdminId: 'admin-1',
      });
      expect(result.token).toBe('token-1');
      expect(result.email).toBe('taiwo@careprofs.ng');
      const stored = [...invitations.store.values()][0];
      expect(stored.tokenHash).toBe('hash:token-1');
    });

    it('blocks inviting an existing user or a duplicate pending email', async () => {
      const role = roles.seedSystem('r-admin', 'Administrator', 'SUPER_ADMIN');
      directory.seedUser({ id: 'u1', email: 'taken@x.com' });
      await expect(
        createUseCase().execute({
          email: 'taken@x.com',
          firstName: 'A',
          lastName: 'B',
          roleId: role.id,
          invitedByAdminId: 'admin-1',
        }),
      ).rejects.toBeInstanceOf(ValidationException);

      await createUseCase().execute({
        email: 'new@x.com',
        firstName: 'A',
        lastName: 'B',
        roleId: role.id,
        invitedByAdminId: 'admin-1',
      });
      await expect(
        createUseCase().execute({
          email: 'new@x.com',
          firstName: 'A',
          lastName: 'B',
          roleId: role.id,
          invitedByAdminId: 'admin-1',
        }),
      ).rejects.toBeInstanceOf(ValidationException);
    });

    it('accepts an invitation, provisioning an account and closing it', async () => {
      const role = roles.seedSystem('r-admin', 'Administrator', 'SUPER_ADMIN');
      const created = await createUseCase().execute({
        email: 'new@x.com',
        firstName: 'New',
        lastName: 'Person',
        roleId: role.id,
        invitedByAdminId: 'admin-1',
      });
      const accept = new AcceptInvitationUseCase(
        invitations,
        roles,
        directory,
        tokens,
        hasher,
        clock,
        sequentialIds('user'),
      );
      const result = await accept.execute({ token: created.token, password: 'Str0ngPass' });
      expect(result.email).toBe('new@x.com');
      expect(directory.provisioned[0].authRole).toBe('SUPER_ADMIN');
      expect(directory.provisioned[0].passwordHash).toBe('hashed:Str0ngPass');
      const stored = invitations.store.get(created.id);
      expect(stored?.status).toBe(InvitationStatus.Accepted);
    });

    it('rejects an invalid token and a weak password', async () => {
      const accept = new AcceptInvitationUseCase(
        invitations,
        roles,
        directory,
        tokens,
        hasher,
        clock,
        sequentialIds('user'),
      );
      await expect(
        accept.execute({ token: 'nope', password: 'Str0ngPass' }),
      ).rejects.toBeInstanceOf(ValidationException);
      await expect(accept.execute({ token: 'nope', password: 'weak' })).rejects.toBeInstanceOf(
        ValidationException,
      );
    });

    it('provisions an account immediately with a temporary password (credentials path)', async () => {
      const role = roles.seedSystem('r-ops', 'Operations Manager', 'OPERATIONS_MANAGER');
      const result = await new ProvisionAdminUserUseCase(
        roles,
        directory,
        hasher,
        sequentialIds('user'),
      ).execute({
        email: 'Coord@Careprofs.NG',
        firstName: 'Ada',
        lastName: 'Obi',
        phoneNumber: ' +234 801 234 5678 ',
        department: 'Operations',
        roleId: role.id,
      });

      expect(result.email).toBe('coord@careprofs.ng');
      expect(result.temporaryPassword.length).toBeGreaterThanOrEqual(8);
      const provisioned = directory.provisioned[0];
      expect(provisioned.mustChangePassword).toBe(true);
      expect(provisioned.authRole).toBe('OPERATIONS_MANAGER');
      expect(provisioned.phoneNumber).toBe('+234 801 234 5678');
      expect(provisioned.department).toBe('Operations');
      expect(provisioned.passwordHash).toBe(`hashed:${result.temporaryPassword}`);

      await expect(
        new ProvisionAdminUserUseCase(roles, directory, hasher, sequentialIds('user')).execute({
          email: 'coord@careprofs.ng',
          firstName: 'Ada',
          lastName: 'Obi',
          roleId: role.id,
        }),
      ).rejects.toBeInstanceOf(ValidationException);
    });

    it('revokes a pending invitation', async () => {
      const role = roles.seedSystem('r-admin', 'Administrator', 'SUPER_ADMIN');
      const created = await createUseCase().execute({
        email: 'new@x.com',
        firstName: 'New',
        lastName: 'Person',
        roleId: role.id,
        invitedByAdminId: 'admin-1',
      });
      const result = await new RevokeInvitationUseCase(invitations, clock).execute({
        invitationId: created.id,
      });
      expect(result.status).toBe(InvitationStatus.Revoked);
    });
  });
});
