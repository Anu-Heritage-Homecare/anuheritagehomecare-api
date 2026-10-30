/** Raw cross context data an incident detail joins, by the incident's related ids. */
export interface IncidentDetailView {
  recipient: {
    name: string;
    dateOfBirth: Date;
    medicalConditions: string[];
    allergies: string[];
    /** The recipient's relationship to the family owner, as captured at onboarding. */
    relationship: string;
    ownerName: string | null;
    ownerPhone: string | null;
  } | null;
  caregiver: {
    name: string;
    /** Professional designation, e.g. "Certified Nurse Assistant (CNA)". */
    designation: string | null;
    phone: string;
    /** The caregiver's supervisor, used as the escalation contact. */
    supervisorName: string | null;
  } | null;
  visit: {
    sequence: number;
    scheduledDate: Date;
    startMinute: number;
    endMinute: number;
    visitType: string;
    status: string;
  } | null;
  coordinatorName: string | null;
}

export interface IncidentDetailReadModel {
  enrich(params: {
    recipientId: string | null;
    caregiverId: string | null;
    visitId: string | null;
    coordinatorAdminId: string | null;
  }): Promise<IncidentDetailView>;
}

export const INCIDENT_DETAIL_READ_MODEL = Symbol('INCIDENT_DETAIL_READ_MODEL');
