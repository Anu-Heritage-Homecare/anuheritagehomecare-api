/** The display fields for an emergency detail that live in other contexts. */
export interface EmergencyEnrichmentView {
  caregiverName: string | null;
  /** The visit's service, e.g. "Personal Care". */
  visitService: string | null;
}

export interface EmergencyEnrichmentReadModel {
  enrich(caregiverId: string, visitId: string): Promise<EmergencyEnrichmentView>;
}

export const EMERGENCY_ENRICHMENT_READ_MODEL = Symbol('EMERGENCY_ENRICHMENT_READ_MODEL');
