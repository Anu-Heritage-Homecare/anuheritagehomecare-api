/** The lookups the Alerts and Incidents screen needs to label and filter its rows. */
export interface AlertsEnrichmentView {
  recipientNames: Map<string, string>;
  caregiverBranches: Map<string, string>;
  visitServiceTypes: Map<string, string>;
}

/**
 * Read model that resolves the care recipient names (the alert source), caregiver
 * branches (for the branch filter) and visit service types (for the service filter),
 * batched by id, across the contexts that own them.
 */
export interface AlertsEnrichmentReadModel {
  enrich(
    recipientIds: string[],
    caregiverIds: string[],
    visitIds: string[],
  ): Promise<AlertsEnrichmentView>;
  /** Resolve admin full names by id, for the "Resolved By" column. */
  adminNames(adminIds: string[]): Promise<Map<string, string>>;
}

export const ALERTS_ENRICHMENT_READ_MODEL = Symbol('ALERTS_ENRICHMENT_READ_MODEL');
