/**
 * Abstraction over the system clock so use cases and the domain never read the
 * wall clock directly. This keeps time deterministic and testable.
 */
export interface Clock {
  now(): Date;
}

export const CLOCK = Symbol('CLOCK');
