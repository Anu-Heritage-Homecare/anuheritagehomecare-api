export interface EmergencyDetailsResult {
  caregiver: string;
  careRecipient: string;
  visit: string;
  location: string;
  /** Local-style clock label of when it was triggered, e.g. "4:32 PM". */
  timeTriggered: string;
  triggeredAt: string;
  /** Elapsed since triggered, e.g. "8 minutes". */
  durationLabel: string;
  assignedTo: string | null;
}

export interface EmergencyProtocolStepResult {
  step: string;
  label: string;
  completed: boolean;
}

export interface EmergencyTimelineEntryResult {
  at: string;
  timeLabel: string;
  description: string;
  kind: string;
}

export interface EmergencyDetailResult {
  id: string;
  /** The incident reference once one has been logged, else a provisional SOS ref. */
  reference: string;
  title: string;
  statusLabel: string;
  /** True while the emergency is active (drives the red banner). */
  critical: boolean;
  details: EmergencyDetailsResult;
  protocol: EmergencyProtocolStepResult[];
  timeline: EmergencyTimelineEntryResult[];
  generatedAt: string;
}
