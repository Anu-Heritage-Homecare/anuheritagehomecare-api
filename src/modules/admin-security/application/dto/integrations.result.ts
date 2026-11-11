import { Integration, IntegrationConfig } from '../../domain/integration.entity';
import { IntegrationCategory } from '../../domain/integration-category.enum';
import { IntegrationStatus } from '../../domain/integration-status.enum';

export interface IntegrationResult {
  id: string;
  key: string;
  name: string;
  category: IntegrationCategory;
  status: IntegrationStatus;
  description: string | null;
  config: IntegrationConfig | null;
  connectedAt: Date | null;
  lastSyncAt: Date | null;
}

export function toIntegrationResult(integration: Integration): IntegrationResult {
  return {
    id: integration.id,
    key: integration.key,
    name: integration.name,
    category: integration.category,
    status: integration.status,
    description: integration.description,
    config: integration.config,
    connectedAt: integration.connectedAt,
    lastSyncAt: integration.lastSyncAt,
  };
}
