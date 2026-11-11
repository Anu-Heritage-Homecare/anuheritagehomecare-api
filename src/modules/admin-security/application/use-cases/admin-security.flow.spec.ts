import { Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException, ValidationException } from '@shared/domain/domain-exception';
import { AuditCategory } from '../../domain/audit-category.enum';
import { Integration } from '../../domain/integration.entity';
import { IntegrationCategory } from '../../domain/integration-category.enum';
import { IntegrationStatus } from '../../domain/integration-status.enum';
import { IntegrationRepository } from '../../domain/integration.repository';
import { MfaEnforcement } from '../../domain/mfa-enforcement.enum';
import { LoginEventOutcome } from '../../domain/login-event-outcome.enum';
import { SecuritySettings } from '../../domain/security-settings.entity';
import { SecuritySettingsRepository } from '../../domain/security-settings.repository';
import {
  AdminLoginHistoryReadPort,
  LoginHistoryEntry,
} from '../ports/admin-login-history-read.port';
import { AdminAuditReadPort, AuditLogEntry } from '../ports/admin-audit-read.port';
import { AuditEventInput, AuditRecorder } from '../ports/audit-recorder.port';
import { GetSecurityScreenUseCase } from './get-security-screen.use-case';
import { GetLoginHistoryUseCase } from './get-login-history.use-case';
import { GetAuditLogsUseCase } from './get-audit-logs.use-case';
import {
  ConfigureIntegrationUseCase,
  GetIntegrationUseCase,
  ListIntegrationsUseCase,
  SetIntegrationStatusUseCase,
  TestIntegrationConnectionUseCase,
} from './integrations.use-cases';
import {
  UpdateMfaUseCase,
  UpdatePasswordPolicyUseCase,
  UpdateSessionSettingsUseCase,
} from './update-security-settings.use-cases';

const NOW = new Date('2026-11-09T09:00:00.000Z');
const clock: Clock = { now: () => NOW };
const ACTOR = { adminId: 'admin-1', name: 'sarah@careprofs.ng' };

class InMemorySettings implements SecuritySettingsRepository {
  current: SecuritySettings | null = null;
  get(): Promise<SecuritySettings | null> {
    return Promise.resolve(this.current);
  }
  save(settings: SecuritySettings): Promise<void> {
    this.current = settings;
    return Promise.resolve();
  }
}

class InMemoryIntegrations implements IntegrationRepository {
  store = new Map<string, Integration>();
  seed(id: string, status: IntegrationStatus): void {
    this.store.set(
      id,
      Integration.rehydrate(id, {
        key: `k-${id}`,
        name: `Integration ${id}`,
        category: IntegrationCategory.Communications,
        status,
        description: null,
        config: null,
        connectedAt: status === IntegrationStatus.Connected ? NOW : null,
        lastSyncAt: null,
        sortOrder: 0,
        createdAt: NOW,
        updatedAt: NOW,
      }),
    );
  }
  list(): Promise<Integration[]> {
    return Promise.resolve([...this.store.values()]);
  }
  findById(id: string): Promise<Integration | null> {
    return Promise.resolve(this.store.get(id) ?? null);
  }
  save(integration: Integration): Promise<void> {
    this.store.set(integration.id, integration);
    return Promise.resolve();
  }
}

class FakeHistory implements AdminLoginHistoryReadPort {
  entries: LoginHistoryEntry[] = [
    {
      id: 'e1',
      email: 'sarah@careprofs.ng',
      operatorName: 'Sarah Jenkins',
      outcome: LoginEventOutcome.Success,
      ipAddress: '192.168.1.42',
      deviceLabel: 'Chrome / macOS',
      at: NOW,
    },
  ];
  recent(limit: number): Promise<LoginHistoryEntry[]> {
    return Promise.resolve(this.entries.slice(0, limit));
  }
  page(page: number, pageSize: number): Promise<{ entries: LoginHistoryEntry[]; total: number }> {
    const start = (page - 1) * pageSize;
    return Promise.resolve({
      entries: this.entries.slice(start, start + pageSize),
      total: this.entries.length,
    });
  }
}

class CapturingAudit implements AuditRecorder, AdminAuditReadPort {
  events: AuditEventInput[] = [];
  record(event: AuditEventInput): Promise<void> {
    this.events.push(event);
    return Promise.resolve();
  }
  page(
    page: number,
    pageSize: number,
    category: AuditCategory | null,
  ): Promise<{ entries: AuditLogEntry[]; total: number }> {
    const filtered = this.events.filter((e) => category === null || e.category === category);
    const start = (page - 1) * pageSize;
    const entries: AuditLogEntry[] = filtered.slice(start, start + pageSize).map((e, i) => ({
      id: `a-${i}`,
      actorName: e.actorName,
      category: e.category,
      action: e.action,
      summary: e.summary,
      ipAddress: e.ipAddress ?? null,
      at: NOW,
    }));
    return Promise.resolve({ entries, total: filtered.length });
  }
}

describe('Admin security flows', () => {
  let settings: InMemorySettings;
  let integrations: InMemoryIntegrations;
  let history: FakeHistory;
  let audit: CapturingAudit;

  beforeEach(() => {
    settings = new InMemorySettings();
    integrations = new InMemoryIntegrations();
    history = new FakeHistory();
    audit = new CapturingAudit();
  });

  it('returns default policy and recent logins when nothing is saved', async () => {
    const result = await new GetSecurityScreenUseCase(settings, history, clock).execute();
    expect(result.passwordPolicy.minLength).toBe(8);
    expect(result.mfa.enforcement).toBe(MfaEnforcement.EnabledForAll);
    expect(result.session.timeoutMinutes).toBe(30);
    expect(result.recentLogins).toHaveLength(1);
  });

  it('updates the password policy and records an audit event', async () => {
    const result = await new UpdatePasswordPolicyUseCase(settings, history, audit, clock).execute({
      actor: ACTOR,
      passwordMinLength: 12,
      requireSpecialChar: false,
    });
    expect(result.passwordPolicy.minLength).toBe(12);
    expect(result.passwordPolicy.requireSpecialChar).toBe(false);
    expect(audit.events).toHaveLength(1);
    expect(audit.events[0].category).toBe(AuditCategory.Security);
  });

  it('rejects an MFA update with no methods', async () => {
    await expect(
      new UpdateMfaUseCase(settings, history, audit, clock).execute({ actor: ACTOR, methods: [] }),
    ).rejects.toBeInstanceOf(ValidationException);
  });

  it('updates session settings', async () => {
    const result = await new UpdateSessionSettingsUseCase(settings, history, audit, clock).execute({
      actor: ACTOR,
      sessionTimeoutMinutes: 15,
      maxConcurrentSessions: 5,
    });
    expect(result.session.timeoutMinutes).toBe(15);
    expect(result.session.maxConcurrentSessions).toBe(5);
  });

  it('connects an integration and records it, raising when missing', async () => {
    integrations.seed('11111111-1111-1111-1111-111111111111', IntegrationStatus.Disconnected);
    const id = '11111111-1111-1111-1111-111111111111';
    const result = await new SetIntegrationStatusUseCase(integrations, audit, clock).execute({
      integrationId: id,
      status: IntegrationStatus.Connected,
      actor: ACTOR,
    });
    expect(result[0].status).toBe(IntegrationStatus.Connected);
    expect(audit.events[0].category).toBe(AuditCategory.Integrations);

    await expect(
      new SetIntegrationStatusUseCase(integrations, audit, clock).execute({
        integrationId: 'missing',
        status: IntegrationStatus.Connected,
        actor: ACTOR,
      }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });

  it('configures a connected integration and tests the connection', async () => {
    const id = '33333333-3333-3333-3333-333333333333';
    integrations.seed(id, IntegrationStatus.Connected);
    const configured = await new ConfigureIntegrationUseCase(integrations, audit, clock).execute({
      integrationId: id,
      config: { syncDirection: 'TWO_WAY', autoSyncIntervalMinutes: 15 },
      actor: ACTOR,
    });
    expect(configured.config).toEqual({ syncDirection: 'TWO_WAY', autoSyncIntervalMinutes: 15 });
    expect(audit.events[0].category).toBe(AuditCategory.Integrations);

    const fetched = await new GetIntegrationUseCase(integrations).execute(id);
    expect(fetched.config).not.toBeNull();

    const test = await new TestIntegrationConnectionUseCase(integrations).execute(id);
    expect(test.ok).toBe(true);
  });

  it('refuses to configure a disconnected integration', async () => {
    const id = '44444444-4444-4444-4444-444444444444';
    integrations.seed(id, IntegrationStatus.Disconnected);
    await expect(
      new ConfigureIntegrationUseCase(integrations, audit, clock).execute({
        integrationId: id,
        config: { syncDirection: 'TWO_WAY' },
        actor: ACTOR,
      }),
    ).rejects.toBeInstanceOf(ValidationException);

    const test = await new TestIntegrationConnectionUseCase(integrations).execute(id);
    expect(test.ok).toBe(false);
  });

  it('lists integrations and pages login history and audit logs', async () => {
    integrations.seed('22222222-2222-2222-2222-222222222222', IntegrationStatus.Connected);
    expect(await new ListIntegrationsUseCase(integrations).execute()).toHaveLength(1);

    const logins = await new GetLoginHistoryUseCase(history).execute({ page: 1, pageSize: 10 });
    expect(logins.total).toBe(1);
    expect(logins.entries[0].outcome).toBe(LoginEventOutcome.Success);

    await audit.record({
      actorAdminId: 'admin-1',
      actorName: 'Sarah',
      category: AuditCategory.Security,
      action: 'x',
      summary: 'y',
    });
    const logs = await new GetAuditLogsUseCase(audit).execute({ page: 1, pageSize: 10 });
    expect(logs.total).toBe(1);
  });
});
