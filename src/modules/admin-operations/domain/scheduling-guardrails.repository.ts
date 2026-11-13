import { SchedulingGuardrails } from './scheduling-guardrails.entity';

/** The fixed id of the one and only scheduling guardrails row. */
export const SCHEDULING_GUARDRAILS_ID = 'scheduling_guardrails';

/** Persistence port for the singleton scheduling guardrails. */
export interface SchedulingGuardrailsRepository {
  get(): Promise<SchedulingGuardrails | null>;
  save(guardrails: SchedulingGuardrails): Promise<void>;
}

export const SCHEDULING_GUARDRAILS_REPOSITORY = Symbol('SCHEDULING_GUARDRAILS_REPOSITORY');
