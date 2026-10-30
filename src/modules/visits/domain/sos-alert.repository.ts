import { SosAlert } from './sos-alert.entity';

/**
 * Persistence port for SOS alerts. `save` upserts, so it covers both raising a new
 * alert and cancelling an existing one; `findById` loads an alert so the caregiver
 * who raised it can cancel it.
 */
export interface SosAlertRepository {
  save(alert: SosAlert): Promise<void>;
  findById(id: string): Promise<SosAlert | null>;
  /** Active alerts, most recent first, for the admin Live Monitoring screen. */
  listActive(): Promise<SosAlert[]>;
  /** Alerts resolved at or after `since`, most recently resolved first, capped at `limit`. */
  listResolvedSince(since: Date, limit: number): Promise<SosAlert[]>;
}

/** Injection token, since TypeScript interfaces do not exist at runtime. */
export const SOS_ALERT_REPOSITORY = Symbol('SOS_ALERT_REPOSITORY');
