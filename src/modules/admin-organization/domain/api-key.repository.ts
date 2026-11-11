import { ApiKey } from './api-key.entity';

/** Persistence port for API keys. */
export interface ApiKeyRepository {
  list(): Promise<ApiKey[]>;
  findById(id: string): Promise<ApiKey | null>;
  /** Look up by the SHA-256 hash of the presented secret (the authentication path). */
  findByHash(keyHash: string): Promise<ApiKey | null>;
  save(apiKey: ApiKey): Promise<void>;
}

export const API_KEY_REPOSITORY = Symbol('API_KEY_REPOSITORY');
