import { ApiKey } from '../../domain/api-key.entity';
import { ApiKeyStatus } from '../../domain/api-key-status.enum';

export interface ApiKeyUsageResult {
  today: number;
  thisWeek: number;
}

/** One API key as the details drawer and the list render it (never the secret). */
export interface ApiKeyResult {
  id: string;
  name: string;
  status: ApiKeyStatus;
  keyPrefix: string;
  last4: string;
  /** A ready to render masked value, for example `sk-cp-****3f7a`. */
  maskedValue: string;
  scopes: string[];
  rateLimitPerHour: number;
  createdById: string | null;
  createdByName: string | null;
  createdAt: Date;
  lastUsedAt: Date | null;
  usage: ApiKeyUsageResult;
}

/** A newly created or regenerated key, carrying the raw secret shown exactly once. */
export interface ApiKeyCreatedResult {
  key: ApiKeyResult;
  secret: string;
}

export function toApiKeyResult(apiKey: ApiKey, now: Date): ApiKeyResult {
  return {
    id: apiKey.id,
    name: apiKey.name,
    status: apiKey.status,
    keyPrefix: apiKey.keyPrefix,
    last4: apiKey.last4,
    maskedValue: `${apiKey.keyPrefix}-****${apiKey.last4}`,
    scopes: [...apiKey.scopes],
    rateLimitPerHour: apiKey.rateLimitPerHour,
    createdById: apiKey.createdById,
    createdByName: apiKey.createdByName,
    createdAt: apiKey.createdAt,
    lastUsedAt: apiKey.lastUsedAt,
    usage: {
      today: apiKey.requestsToday(now),
      thisWeek: apiKey.requestsThisWeek(now),
    },
  };
}
