/** One location breadcrumb recorded during a visit, for the Location and Check-in tab. */
export interface VisitLocationPingView {
  latitude: number;
  longitude: number;
  mode: string;
  recordedAt: Date;
}

/**
 * Read model over the tracking context's location pings, scoped to a single visit,
 * for the admin Visit Details Location and Check-in tab.
 */
export interface VisitLocationReadModel {
  pingsForVisit(visitId: string, limit: number): Promise<VisitLocationPingView[]>;
}

export const VISIT_LOCATION_READ_MODEL = Symbol('VISIT_LOCATION_READ_MODEL');
