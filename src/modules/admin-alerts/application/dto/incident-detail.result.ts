export interface IncidentRecipientCardResult {
  name: string;
  age: number;
  /** Not stored anywhere today; returned null until a languages field exists. */
  primaryLanguage: string | null;
  emergencyContact: string | null;
  diagnosedConditions: string[];
}

export interface IncidentCaregiverCardResult {
  name: string;
  designation: string | null;
  phone: string | null;
}

export interface IncidentRelatedVisitResult {
  reference: string;
  scheduleLabel: string;
  serviceType: string;
  statusLabel: string;
}

export interface IncidentDetailResult {
  id: string;
  reference: string;
  incidentType: string;
  priorityLabel: string;
  statusLabel: string;
  /** True while the incident is still active (Open or Under Review). */
  active: boolean;
  reportedBy: string;
  reportedTime: string;
  reportedAt: string;
  description: string | null;
  assignedCoordinator: string | null;
  recipient: IncidentRecipientCardResult | null;
  caregiver: IncidentCaregiverCardResult | null;
  relatedVisit: IncidentRelatedVisitResult | null;
  generatedAt: string;
}
