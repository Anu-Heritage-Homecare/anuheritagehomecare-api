/**
 * A slot in a recipient's recurring weekly coverage grid. MORNING (8am to 12pm)
 * and AFTERNOON (12pm to 5pm) blocks are assigned to a caregiver, or left open.
 */
export enum CoverageSlot {
  Morning = 'MORNING',
  Afternoon = 'AFTERNOON',
}

/** Every valid slot, used to validate incoming values at the boundary. */
export const ALL_COVERAGE_SLOTS: readonly CoverageSlot[] = Object.values(CoverageSlot);
