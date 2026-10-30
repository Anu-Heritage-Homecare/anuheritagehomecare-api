/**
 * The fixed steps of the emergency response protocol a coordinator works through
 * for an SOS alert. The set and their order are a business constant; which steps
 * are done for a given alert is persisted as completions.
 */
export enum EmergencyProtocolStep {
  SosConfirmation = 'SOS_CONFIRMATION',
  AssessVisit = 'ASSESS_VISIT',
  NotifyFamily = 'NOTIFY_FAMILY',
  DispatchSupervisor = 'DISPATCH_SUPERVISOR',
  LogIncident = 'LOG_INCIDENT',
}

/** The protocol steps in the order they are shown, with their display labels. */
export const EMERGENCY_PROTOCOL: ReadonlyArray<{ step: EmergencyProtocolStep; label: string }> = [
  {
    step: EmergencyProtocolStep.SosConfirmation,
    label: 'Trigger SOS confirmation and attempt call back to caregiver',
  },
  { step: EmergencyProtocolStep.AssessVisit, label: 'Assess status of the visit' },
  { step: EmergencyProtocolStep.NotifyFamily, label: 'Notify family representative' },
  {
    step: EmergencyProtocolStep.DispatchSupervisor,
    label: 'Dispatch regional response supervisor',
  },
  { step: EmergencyProtocolStep.LogIncident, label: 'Log incident report' },
];
