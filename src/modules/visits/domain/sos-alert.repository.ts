import { SosAlert } from './sos-alert.entity';

/**
 * Persistence port for SOS alerts. `save` upserts, so it covers both raising a new
 * alert and cancelling an existing one; `findById` loads an alert so the caregiver
 * who raised it can cancel it.
 */
export interface SosAlertRepository {
  save(alert: SosAlert): Promise<void>;
  findById(id: string): Promise<SosAlert | null>;
}

/** Injection token, since TypeScript interfaces do not exist at runtime. */
export const SOS_ALERT_REPOSITORY = Symbol('SOS_ALERT_REPOSITORY');
