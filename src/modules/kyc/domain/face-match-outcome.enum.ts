/**
 * Result of matching the owner's live selfie to the photo on their identity
 * document. NOT_AVAILABLE means the provider did not return a face result.
 */
export enum FaceMatchOutcome {
  Match = 'MATCH',
  NoMatch = 'NO_MATCH',
  NotAvailable = 'NOT_AVAILABLE',
}
