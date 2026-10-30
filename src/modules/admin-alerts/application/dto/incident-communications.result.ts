export interface IncidentCommunicationRowResult {
  id: string;
  at: string;
  timeLabel: string;
  dayLabel: string;
  /** "4:38 PM, Jul 18 2026". */
  timestampLabel: string;
  contactName: string;
  contactRole: string | null;
  channel: string;
  channelLabel: string;
  outcome: string;
  outcomeLabel: string;
  notes: string | null;
}

export interface QuickContactResult {
  name: string;
  /** A relationship, role or subtitle, e.g. "Daughter", "Internal Coordinator Hub". */
  subtitle: string | null;
  phone: string | null;
}

export interface QuickContactBookResult {
  familyEmergencyContact: QuickContactResult | null;
  assignedCaregiver: QuickContactResult | null;
  escalationSupervisor: QuickContactResult | null;
}

export interface IncidentCommunicationsResult {
  id: string;
  reference: string;
  communications: IncidentCommunicationRowResult[];
  contactBook: QuickContactBookResult;
  generatedAt: string;
}
