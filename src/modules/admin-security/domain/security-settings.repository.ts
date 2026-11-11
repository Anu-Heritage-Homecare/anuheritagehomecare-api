import { SecuritySettings } from './security-settings.entity';

/** The fixed id of the one and only security settings row. */
export const SECURITY_SETTINGS_ID = 'security_settings';

/** Persistence port for the singleton security settings. */
export interface SecuritySettingsRepository {
  get(): Promise<SecuritySettings | null>;
  save(settings: SecuritySettings): Promise<void>;
}

export const SECURITY_SETTINGS_REPOSITORY = Symbol('SECURITY_SETTINGS_REPOSITORY');
