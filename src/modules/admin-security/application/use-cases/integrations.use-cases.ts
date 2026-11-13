import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { AuditCategory } from '../../domain/audit-category.enum';
import { IntegrationConfig } from '../../domain/integration.entity';
import { IntegrationStatus } from '../../domain/integration-status.enum';
import { INTEGRATION_REPOSITORY, IntegrationRepository } from '../../domain/integration.repository';
import { AUDIT_RECORDER, AuditRecorder } from '../ports/audit-recorder.port';
import { IntegrationResult, toIntegrationResult } from '../dto/integrations.result';
import { AuditActor } from './update-security-settings.use-cases';

/** Use case: list the third party integrations (the Integrations tab). */
@Injectable()
export class ListIntegrationsUseCase {
  constructor(
    @Inject(INTEGRATION_REPOSITORY) private readonly integrations: IntegrationRepository,
  ) {}

  async execute(): Promise<IntegrationResult[]> {
    const integrations = await this.integrations.list();
    return integrations.map(toIntegrationResult);
  }
}

/** Use case: fetch one integration with its configuration (the Configure drawer). */
@Injectable()
export class GetIntegrationUseCase {
  constructor(
    @Inject(INTEGRATION_REPOSITORY) private readonly integrations: IntegrationRepository,
  ) {}

  async execute(integrationId: string): Promise<IntegrationResult> {
    const integration = await this.integrations.findById(integrationId);
    if (integration === null) {
      throw new NotFoundDomainException('Integration not found');
    }
    return toIntegrationResult(integration);
  }
}

export interface ConfigureIntegrationCommand {
  integrationId: string;
  config: IntegrationConfig;
  actor: AuditActor;
}

/** Use case: save an integration's configuration (the Save Configuration action). */
@Injectable()
export class ConfigureIntegrationUseCase {
  constructor(
    @Inject(INTEGRATION_REPOSITORY) private readonly integrations: IntegrationRepository,
    @Inject(AUDIT_RECORDER) private readonly audit: AuditRecorder,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: ConfigureIntegrationCommand): Promise<IntegrationResult> {
    const integration = await this.integrations.findById(command.integrationId);
    if (integration === null) {
      throw new NotFoundDomainException('Integration not found');
    }
    integration.configure(command.config, this.clock.now());
    await this.integrations.save(integration);
    await this.audit.record({
      actorAdminId: command.actor.adminId,
      actorName: command.actor.name,
      category: AuditCategory.Integrations,
      action: 'integration.configured',
      summary: `${integration.name} configuration updated`,
    });
    return toIntegrationResult(integration);
  }
}

export interface TestIntegrationConnectionResult {
  ok: boolean;
  message: string;
}

/**
 * Use case: test an integration's connection (the Test Connection action). There is
 * no live connector yet, so this reports reachable only when the integration is
 * marked connected; a real provider handshake replaces this when a connector exists.
 */
@Injectable()
export class TestIntegrationConnectionUseCase {
  constructor(
    @Inject(INTEGRATION_REPOSITORY) private readonly integrations: IntegrationRepository,
  ) {}

  async execute(integrationId: string): Promise<TestIntegrationConnectionResult> {
    const integration = await this.integrations.findById(integrationId);
    if (integration === null) {
      throw new NotFoundDomainException('Integration not found');
    }
    const ok = integration.status === IntegrationStatus.Connected;
    return {
      ok,
      message: ok ? `${integration.name} is connected` : `${integration.name} is not connected`,
    };
  }
}

export interface SetIntegrationStatusCommand {
  integrationId: string;
  status: IntegrationStatus;
  actor: AuditActor;
}

/** Use case: connect or disconnect an integration. */
@Injectable()
export class SetIntegrationStatusUseCase {
  constructor(
    @Inject(INTEGRATION_REPOSITORY) private readonly integrations: IntegrationRepository,
    @Inject(AUDIT_RECORDER) private readonly audit: AuditRecorder,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: SetIntegrationStatusCommand): Promise<IntegrationResult[]> {
    const integration = await this.integrations.findById(command.integrationId);
    if (integration === null) {
      throw new NotFoundDomainException('Integration not found');
    }
    integration.setStatus(command.status, this.clock.now());
    await this.integrations.save(integration);
    await this.audit.record({
      actorAdminId: command.actor.adminId,
      actorName: command.actor.name,
      category: AuditCategory.Integrations,
      action: 'integration.status.changed',
      summary: `${integration.name} ${command.status === IntegrationStatus.Connected ? 'connected' : 'disconnected'}`,
    });
    const integrations = await this.integrations.list();
    return integrations.map(toIntegrationResult);
  }
}
