import { OperationalAlert } from './operational-alert.entity';

/**
 * Persistence port for operational alerts. The dashboard reads the open alerts
 * and their count; the detail action resolves or dismisses one by id.
 */
export interface OperationalAlertRepository {
  save(alert: OperationalAlert): Promise<void>;
  findById(id: string): Promise<OperationalAlert | null>;
  /** Open alerts, most recent first, capped at `limit`. */
  listOpen(limit: number): Promise<OperationalAlert[]>;
  countOpen(): Promise<number>;
  /**
   * Whether an open alert of a given type already exists for a visit. Used by the
   * derived detectors to avoid raising duplicates for the same problem.
   */
  existsOpenForVisit(type: string, visitId: string): Promise<boolean>;
}

export const OPERATIONAL_ALERT_REPOSITORY = Symbol('OPERATIONAL_ALERT_REPOSITORY');
