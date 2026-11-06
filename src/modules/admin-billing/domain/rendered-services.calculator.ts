/**
 * Derive the billable quantities for an invoice period from the recipient's rendered
 * care (their completed visits). This is the office billing rule for the Create Invoice
 * wizard, step 3: hourly services bill the clocked time, session services bill per visit,
 * and the flat coordination fee applies once when any care was rendered.
 */

/** One completed visit feeding the derivation. Minutes are timezone free. */
export interface RenderedVisit {
  visitType: string;
  /** Attendance stamps, when the caregiver clocked in and out. Null when not clocked. */
  clockInAt: Date | null;
  clockOutAt: Date | null;
  /** The scheduled window, minutes from midnight, used when the visit was not clocked. */
  startMinute: number;
  endMinute: number;
  /** Total break minutes to exclude from clocked time. */
  breakMinutes: number;
}

/** A catalog service the derivation prices a quantity for. */
export interface CatalogServiceRef {
  code: string;
  unit: 'HOURLY' | 'SESSION' | 'FIXED';
}

export interface DerivedQuantity {
  quantity: number;
  /** How many completed visits fed this line (0 for the flat coordination fee). */
  sourceVisitCount: number;
}

/**
 * The office rule mapping a visit's type to the billable service it renders. Unmapped
 * types (e.g. COMPANIONSHIP, WOUND_CARE) have no catalog equivalent and are not auto
 * billed; extend this map if the catalog gains a matching service.
 */
export const VISIT_TYPE_TO_SERVICE_CODE: Record<string, string> = {
  PERSONAL_CARE: 'PERSONAL_CARE_SUPPORT',
  MORNING_CARE: 'PERSONAL_CARE_SUPPORT',
  MEDICATION: 'MEDICATION_MANAGEMENT',
  PHYSICAL_THERAPY: 'PHYSIOTHERAPY_SESSIONS',
};

/** The billable minutes for one visit: clocked time net of breaks, else the schedule. */
export function visitBillableMinutes(visit: RenderedVisit): number {
  if (visit.clockInAt !== null && visit.clockOutAt !== null) {
    const worked = (visit.clockOutAt.getTime() - visit.clockInAt.getTime()) / 60_000;
    return Math.max(0, worked - visit.breakMinutes);
  }
  return Math.max(0, visit.endMinute - visit.startMinute);
}

/**
 * Quantity per catalog service derived from the completed visits. Hourly services sum
 * their billable hours (rounded to two decimals), session services count their visits,
 * and a fixed service bills a flat 1 when any care was rendered in the period.
 */
export function deriveRenderedQuantities(
  visits: RenderedVisit[],
  services: CatalogServiceRef[],
): Map<string, DerivedQuantity> {
  const minutesByCode = new Map<string, number>();
  const countByCode = new Map<string, number>();
  for (const visit of visits) {
    const code = VISIT_TYPE_TO_SERVICE_CODE[visit.visitType];
    if (code === undefined) {
      continue;
    }
    minutesByCode.set(code, (minutesByCode.get(code) ?? 0) + visitBillableMinutes(visit));
    countByCode.set(code, (countByCode.get(code) ?? 0) + 1);
  }

  const anyCareRendered = visits.length > 0;
  const quantities = new Map<string, DerivedQuantity>();
  for (const service of services) {
    const sourceVisitCount = countByCode.get(service.code) ?? 0;
    let quantity: number;
    if (service.unit === 'HOURLY') {
      quantity = round2((minutesByCode.get(service.code) ?? 0) / 60);
    } else if (service.unit === 'SESSION') {
      quantity = sourceVisitCount;
    } else {
      quantity = anyCareRendered ? 1 : 0;
    }
    quantities.set(service.code, { quantity, sourceVisitCount });
  }
  return quantities;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
