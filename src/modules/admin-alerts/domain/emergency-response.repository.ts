import { EmergencyProtocolStep } from './emergency-protocol-step.enum';
import { SosProtocolCompletion } from './sos-protocol-completion.entity';
import { SosResponseEvent } from './sos-response-event.entity';

/**
 * Persistence port for an SOS alert's admin response: the completed protocol steps
 * and the appended timeline events. Keyed by the visits SOS alert id.
 */
export interface EmergencyResponseRepository {
  listCompletions(sosAlertId: string): Promise<SosProtocolCompletion[]>;
  /** Mark a step done (idempotent on the sosAlertId + step pair). */
  saveCompletion(completion: SosProtocolCompletion): Promise<void>;
  /** Clear a step's completion (un-tick). A no-op if it was not completed. */
  removeCompletion(sosAlertId: string, step: EmergencyProtocolStep): Promise<void>;
  listEvents(sosAlertId: string): Promise<SosResponseEvent[]>;
  appendEvent(event: SosResponseEvent): Promise<void>;
}

export const EMERGENCY_RESPONSE_REPOSITORY = Symbol('EMERGENCY_RESPONSE_REPOSITORY');
