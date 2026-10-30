/** The outcome of a documented incident communication. */
export enum CommunicationOutcome {
  Reached = 'REACHED',
  NoAnswer = 'NO_ANSWER',
  LeftMessage = 'LEFT_MESSAGE',
  Acknowledged = 'ACKNOWLEDGED',
}

/** The human label for a communication outcome, e.g. "Reached". */
export const COMMUNICATION_OUTCOME_LABELS: Record<CommunicationOutcome, string> = {
  [CommunicationOutcome.Reached]: 'Reached',
  [CommunicationOutcome.NoAnswer]: 'No Answer',
  [CommunicationOutcome.LeftMessage]: 'Left Message',
  [CommunicationOutcome.Acknowledged]: 'Acknowledged',
};
